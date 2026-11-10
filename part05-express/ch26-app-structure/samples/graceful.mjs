// 第26章 8節で書く、SIGTERM・Ctrl+C できれいに止まるサーバの完成形
// 使い方（~/dev/part05/ch26-app-structure で）: node samples/graceful.mjs
//   別のターミナルで curl -s http://127.0.0.1:9337/slow を打ち、すぐにサーバのターミナルで Ctrl+C を押す
import express from 'express';

const PORT = 9337;
const app = express();
app.disable('x-powered-by');

let ready = true;
app.get('/readyz', (req, res) => res.status(ready ? 200 : 503).json({ ready }));
app.get('/slow', async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  res.json({ message: '3秒かかる処理が終わりました' });
});

const server = app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));

let stopping = false;
function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  ready = false;
  console.log(`${signal} を受け取りました。処理中のリクエストが終わるのを待ちます`);
  setTimeout(() => {
    console.log('時間切れなので、あきらめて止めます');
    process.exit(1);
  }, 10_000).unref();
  server.close(() => {
    console.log('すべて終わったので止めます');
    process.exitCode = 0;
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
