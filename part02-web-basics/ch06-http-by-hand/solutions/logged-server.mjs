// 練習問題7 の模範解答: app-handler.mjs の handler を変えずに、アクセスログを付けるサーバ
// 使い方（~/dev/ch06 で）: node solutions/logged-server.mjs > access.log
//   この解答は exercises/ の隣に置いて動かす前提で、../exercises/app-handler.mjs を読み込む。
//   自分で ~/dev/ch06 に作るときは './exercises/app-handler.mjs' と書く。
import http from 'node:http';
import { handler } from '../exercises/app-handler.mjs';

const server = http.createServer((req, res) => {
  const start = Date.now();
  res.on('finish', () => {
    const time = new Date().toISOString();
    const ip = req.socket.remoteAddress;
    console.log(`${time} ${ip} "${req.method} ${req.url} HTTP/${req.httpVersion}" ${res.statusCode} ${Date.now() - start}ms`);
  });
  handler(req, res); // 処理は handler に任せる。ログを出す部分は、その前後に足しただけ
});

server.listen(8082, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8082/ で待ち受けています');
});
