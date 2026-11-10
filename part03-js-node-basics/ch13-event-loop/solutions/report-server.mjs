// 練習問題8 の解答: 重い計算を worker_threads に移し、イベントループを止めないサーバ
// 使い方: node report-server.mjs        （http://127.0.0.1:9131）
// 確かめ方: cd ../exercises && TARGET=../solutions/report-server.mjs bash check-report-server.sh
import http from 'node:http';
import { Worker } from 'node:worker_threads';

const PORT = Number(process.env.PORT ?? 9131);
// 追加: 同時に動かす計算の数の上限。超えたら 503 で断る（CPU のコアより多く動かしても速くならない）
const MAX_JOBS = Number(process.env.MAX_JOBS ?? 2);
let runningJobs = 0;

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}

// 追加: Worker で計算し、結果を Promise で返す
function countPrimesInWorker(from, to) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./report-worker.mjs', import.meta.url), { workerData: { from, to } });
    worker.once('message', resolve);
    worker.once('error', reject); // Worker の中で例外が投げられた
    worker.once('exit', (code) => {
      // message の後の exit(0) は正常。message の前に終わったら失敗（resolve 済みなら reject は無視される）
      if (code !== 0) reject(new Error(`Worker が終了コード ${code} で終わりました`));
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/health') return sendJson(res, 200, { ok: true });

  if (url.pathname === '/report') {
    const n = Number(url.searchParams.get('n'));
    if (!Number.isInteger(n) || n < 1 || n > 10_000_000) {
      return sendJson(res, 400, { error: 'n は 1〜10000000 の整数にしてください' });
    }
    // 追加: 混んでいたら断る。待たせ続けるより、「後でもう一度」と伝える方が親切
    if (runningJobs >= MAX_JOBS) {
      return sendJson(res, 503, { error: '混雑しています。少し待ってからやり直してください' }, { 'retry-after': '1' });
    }
    runningJobs++;
    try {
      // 修正: メインのスレッドで計算せず、Worker に任せて await する。待っている間も他のリクエストに応えられる
      const primes = await countPrimesInWorker(1, n);
      sendJson(res, 200, { n, primes });
    } catch (err) {
      console.error(err);
      sendJson(res, 500, { error: '計算に失敗しました' });
    } finally {
      runningJobs--; // 成功しても失敗しても、枠を返す
    }
    return;
  }

  sendJson(res, 404, { error: 'not found' });
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/health`));
