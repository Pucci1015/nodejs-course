// 第17章 7節で書く、Ctrl+C で処理中のリクエストを返してから止まるサーバの完成形
// 使い方（~/dev/part04/ch17-minimal-server で）: node samples/stop-server.mjs
//   別のターミナルで: curl http://127.0.0.1:9179/slow   を打ったら、2秒以内にサーバのターミナルで Ctrl+C
import http from 'node:http';

const PORT = 9179;

const server = http.createServer(async (req, res) => {
  if (req.url === '/slow') {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // 2秒かかる仕事のつもり
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Connection', 'close'); // この例では keep-alive を使わない（7.3節）
  res.end(`${req.url} を返しました\n`);
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));

process.on('SIGINT', () => {
  console.log('止めます。処理中のリクエストを返し終わるまで待ちます…');
  server.close(() => {
    console.log('すべて返し終わりました');
    process.exitCode = 130;
  });
});
