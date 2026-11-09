// CORS に対応した小さな API（第9章 5.1節・5.2節で書くものの完成形）
// 使い方: node my-api.mjs        画面は my-front.mjs（http://localhost:8310/）
import http from 'node:http';

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}  Origin: ${req.headers.origin ?? '（なし）'}`);
  // 5.1節: このオリジンの JavaScript には、レスポンスを読ませてよい
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8310');

  // 5.2節: プリフライト（本番の前の問い合わせ）に答える
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
