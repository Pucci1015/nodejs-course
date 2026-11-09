// サーバを安全に止める（第17章 7節）
// 使い方: node shutdown-demo.mjs
//   別のターミナルで: curl -s http://127.0.0.1:9174/slow &  のすぐ後に、サーバのターミナルで Ctrl+C
//   処理中の /slow は最後まで返り、その後にプロセスが終わる。もう一度 Ctrl+C を押すと、すぐに終わる
import http from 'node:http';

const PORT = 9174;
const FORCE_AFTER_MS = 5000; // これだけ待っても終わらなければ、接続を切って終わる
let stopping = false;

const server = http.createServer(async (req, res) => {
  if (req.url === '/slow') await new Promise((r) => setTimeout(r, 3000));
  // 止めている途中なら、この返事のあと接続を閉じてもらう（keep-alive のまま残らないように）
  if (stopping) res.setHeader('Connection', 'close');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(`${req.url} を返しました\n`);
});
function shutdown(signal) {
  if (stopping) {
    console.error(`${signal}（2回目）: すぐに終わります`);
    process.exit(1);
  }
  stopping = true;
  console.error(`${signal} を受け取りました。新しい接続を受け付けるのをやめて、処理中のリクエストを待ちます`);

  // 1. listen をやめる（新しい接続は来なくなる）。すべての接続が閉じたら、コールバックが呼ばれる
  server.close((err) => {
    console.error(err ? `close のエラー: ${err.message}` : 'すべての接続が閉じました。終わります');
    process.exitCode = err ? 1 : 0;
  });
  // 2. 何もしていない keep-alive の接続を閉じる（Node 19 からは close() もしてくれるが、はっきり書いておく）
  server.closeIdleConnections();
  // 3. 待ちすぎないように。unref で、このタイマーだけが残ってもプロセスは終われる
  setTimeout(() => {
    console.error(`${FORCE_AFTER_MS}ms 待っても終わらないので、残りの接続を切ります`);
    server.closeAllConnections();
    process.exitCode = 1;
  }, FORCE_AFTER_MS).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（PID ${process.pid}）`));
