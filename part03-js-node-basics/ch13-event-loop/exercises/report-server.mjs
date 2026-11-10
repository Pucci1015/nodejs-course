// 練習問題8: 重い計算でイベントループが止まるサーバ。止まらないように直してください。
// 使い方: node report-server.mjs        （http://127.0.0.1:9131）
// 確かめ方: bash check-report-server.sh
//
//   GET /health        → {"ok":true}            （監視の仕組みが数秒ごとに呼ぶ。すぐに返事をしたい）
//   GET /report?n=数   → {"n":数,"primes":個数}  （n 以下の素数の数。n は 1〜10000000 の整数）
import http from 'node:http';
import { countPrimes } from './primes.mjs';

const PORT = Number(process.env.PORT ?? 9131);

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/health') return sendJson(res, 200, { ok: true });

  if (url.pathname === '/report') {
    const n = Number(url.searchParams.get('n'));
    if (!Number.isInteger(n) || n < 1 || n > 10_000_000) {
      return sendJson(res, 400, { error: 'n は 1〜10000000 の整数にしてください' });
    }
    const primes = countPrimes(1, n); // ← ここで、計算が終わるまでサーバ全体が止まる
    return sendJson(res, 200, { n, primes });
  }

  sendJson(res, 404, { error: 'not found' });
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/health`));
