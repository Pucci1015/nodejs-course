// 第18章 4〜5節で書く、ルートを表にして引くサーバの完成形
// 使い方（~/dev/part04/ch18-routing で）: node samples/routes-table.mjs
//   別のターミナルで: curl -i http://127.0.0.1:9183/hello
//                     curl -i -X POST http://127.0.0.1:9183/hello   → 405 と Allow: GET
//                     curl -i http://127.0.0.1:9183/nai            → 404
import http from 'node:http';

const PORT = 9183;

function sendText(res, status, text, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    ...headers,
  });
  res.end(text);
}

// メソッド・パス・ハンドラの組の表
const routes = [
  { method: 'GET', path: '/', handler: (req, res) => sendText(res, 200, 'トップです\n') },
  { method: 'GET', path: '/hello', handler: (req, res) => sendText(res, 200, 'こんにちは\n') },
  { method: 'POST', path: '/echo', handler: (req, res) => sendText(res, 200, 'POST を受け取りました\n') },
];

const server = http.createServer((req, res) => {
  const { pathname } = new URL(`http://localhost${req.url}`);
  const samePath = routes.filter((r) => r.path === pathname); // パスがあてはまるルート
  if (samePath.length === 0) {
    return sendText(res, 404, '見つかりません\n');
  }
  const route = samePath.find((r) => r.method === req.method);
  if (!route) {
    const allow = samePath.map((r) => r.method).join(', ');
    return sendText(res, 405, 'このメソッドは使えません\n', { Allow: allow });
  }
  route.handler(req, res);
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
