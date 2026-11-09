// HTTP で来たら HTTPS へリダイレクトするサーバ（第8章 7.1節で書くものの完成形）
// 使い方: node to-https.mjs        curl -i http://localhost:8180/hello
import http from 'node:http';

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url} → HTTPS へ`);
  res.statusCode = 308; // メソッドとボディを保ったまま移動する（第7章4.2節）
  res.setHeader('Location', `https://localhost:8444${req.url}`);
  res.end();
});

server.listen(8180, '127.0.0.1', () => {
  console.log('http://localhost:8180/ で待ち受けています（HTTPS へリダイレクトする）');
});
