// 練習問題8 解答例: SIGTERM / SIGINT で安全に止まるサーバ
// 使い方: node graceful-server.mjs   （止めるのは Ctrl+C か kill PID）
import http from 'node:http';

const PORT = Number(process.env.PORT ?? 9178);
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 3000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let served = 0;
let stopping = false;

const server = http.createServer(async (req, res) => {
  if (req.url === '/slow') await sleep(1000);
  if (req.url === '/hang') return; // わざと返さない（終わらない処理のつもり）
  served++;
  // 追加: 止めている途中なら「この返事のあと接続を閉じる」と伝える。
  // これが無いと、keep-alive の客とつながったままになり、keepAliveTimeout（5 秒）まで終われない
  if (stopping) res.setHeader('Connection', 'close');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(`${req.url} done\n`);
});

// 10 秒ごとに、何件返したかをログに書く
const statsTimer = setInterval(() => console.log(`これまでに ${served} 件返しました`), 10_000);

function shutdown(signal) {
  if (stopping) {
    // 2回目: 待たずに終わる
    console.error(`${signal}（2回目）: すぐに終わります`);
    process.exit(1);
  }
  stopping = true;
  console.error(`${signal}: 止め始めます`);

  // 追加: これを止めないと、サーバが閉じてもプロセスが終わらない
  clearInterval(statsTimer);

  server.close((err) => {
    console.error('すべての接続が閉じました');
    if (err) process.exitCode = 1;
    // ここで process.exit() は呼ばない。残った仕事（ログの書き出しなど）が終わってから、自然に終わる
  });
  server.closeIdleConnections(); // 念のため。Node 19 からは close() も、いま何もしていない接続を閉じてくれる

  const timer = setTimeout(() => {
    console.error(`${SHUTDOWN_TIMEOUT_MS}ms 待っても終わらないので、残りの接続を切ります`);
    process.exitCode = 1;
    server.closeAllConnections();
  }, SHUTDOWN_TIMEOUT_MS);
  timer.unref(); // このタイマーのせいで終われない、ということがないように
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（PID ${process.pid}）`));
