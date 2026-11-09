// いちばん小さな Express のアプリ（第23章 2節）
//   $ node hello-express.mjs
//   別のターミナルで: curl -i http://127.0.0.1:9300/
//                     curl -i http://127.0.0.1:9300/hello/花子     （curl は日本語を %xx にして送る）
import http from 'node:http';
import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('こんにちは、Express');
});

app.get('/hello/:name', (req, res) => {
  // req.params.name は、%xx を戻した後の文字列
  res.json({ message: `こんにちは、${req.params.name}さん` });
});

// app は「(req, res) を受け取る関数」なので、node:http の createServer にそのまま渡せる。
// app.listen(…) は、この2行を短く書いたもの（Express の中でも http.createServer(app) をしている）
console.log('typeof app =', typeof app);
const server = http.createServer(app);
server.listen(9300, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9300/ で待っています（Ctrl+C で止める）');
});
