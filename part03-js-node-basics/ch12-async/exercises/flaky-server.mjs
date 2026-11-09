// 練習問題6 用: わざと調子の悪い API サーバ（http://127.0.0.1:9121）
// 使い方: node flaky-server.mjs        （Ctrl+C で止める）
//
//   GET /items/:id   商品を JSON で返す。ただし id によって調子が悪い:
//     - id が 7 の倍数      … 最初の2回は 503 Service Unavailable、3回目から成功
//     - id が 5 の倍数      … 最初の1回は 3秒間返事をしない（タイムアウトさせる練習）
//     - id が 13            … 404 Not Found（何度やっても同じ。やり直す意味がない）
//     - id が 29            … いつも 503（やり直しても直らない）
//     - それ以外             … 30〜79ms で成功
//   GET /stats       これまでのリクエスト数と、同時に処理していた数の最大を返す
//
// 「何回目のリクエストか」は id ごとに数えているので、サーバを起動し直すと最初からになります。
import http from 'node:http';

const PORT = Number(process.env.PORT ?? 9121);
const counts = new Map(); // id → これまでに来たリクエストの数
let running = 0;
let maxConcurrent = 0;
let requests = 0;

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/stats') return send(res, 200, { requests, maxConcurrent });

  const m = url.pathname.match(/^\/items\/(\d+)$/);
  if (req.method !== 'GET' || !m) return send(res, 404, { error: 'not found' });

  const id = Number(m[1]);
  const nth = (counts.get(id) ?? 0) + 1;
  counts.set(id, nth);
  requests++;
  running++;
  maxConcurrent = Math.max(maxConcurrent, running);
  console.log(`GET /items/${id}（${nth}回目） 同時に ${running}`);

  let timer;
  // クライアントがあきらめて接続を切ったときも、ここで数を減らす
  res.on('close', () => {
    running--;
    clearTimeout(timer);
  });

  const later = (ms, fn) => {
    timer = setTimeout(fn, ms);
  };
  if (id === 13) return later(20, () => send(res, 404, { error: `item ${id} は存在しません` }));
  if (id === 29) return later(20, () => send(res, 503, { error: 'メンテナンス中' }));
  if (id % 7 === 0 && nth <= 2) return later(20, () => send(res, 503, { error: '混雑しています' }));
  if (id % 5 === 0 && nth === 1) return later(3000, () => send(res, 200, { id, title: `商品 ${id}（遅れて届いた）` }));
  later(30 + ((id * 17) % 50), () => send(res, 200, { id, title: `商品 ${id}`, price: id * 100 }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`flaky server: http://127.0.0.1:${PORT}/items/1`);
});
