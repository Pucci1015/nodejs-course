// いちばん小さな Web サーバ（第17章 2節）
// 使い方: node hello-server.mjs   → 別のターミナルで curl -i http://127.0.0.1:9170/
import http from 'node:http';

const PORT = 9170;

// リクエストが来るたびに、この関数が呼ばれる。req が届いたリクエスト、res がこれから返すレスポンス
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(`こんにちは。あなたが開いたのは ${req.url} です\n`);
});

// 127.0.0.1 だけで待ち受ける（同じ Mac の中からだけ繋がる）
server.listen(PORT, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`);
});
