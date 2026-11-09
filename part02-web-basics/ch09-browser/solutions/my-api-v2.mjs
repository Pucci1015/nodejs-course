// 練習問題3 の模範解答: 許可するオリジンを一覧にした API（my-api.mjs をコピーして変えたもの）
// 使い方: node my-api-v2.mjs        画面は samples/my-front.mjs（http://localhost:8310/ と http://127.0.0.1:8310/）
import http from 'node:http';

const ALLOWED_ORIGINS = ['http://localhost:8310', 'http://127.0.0.1:8310'];

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  console.log(`${req.method} ${req.url}  Origin: ${origin ?? '（なし）'}`);

  // Origin によってヘッダが変わることを、キャッシュに伝える（許可しないときも付ける）
  res.setHeader('Vary', 'Origin');
  // 一覧と完全に一致するときだけ、そのオリジンを返す
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.statusCode = 204;
    res.end();
    return;
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(`${req.method} を受け取りました（API のサーバから）\n`);
});

server.listen(8311, '127.0.0.1', () => {
  console.log('API: http://localhost:8311/api/hello');
});
