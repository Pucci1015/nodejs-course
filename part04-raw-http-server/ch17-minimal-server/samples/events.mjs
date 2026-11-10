// 第17章 3節で書く、1つのリクエストで起きるイベントを表示するサーバの完成形
// 使い方（~/dev/part04/ch17-minimal-server で）: node samples/events.mjs
//   別のターミナルで: curl -s http://127.0.0.1:9179/a
import http from 'node:http';

const PORT = 9179;

const server = http.createServer((req, res) => {
  console.log('request: ヘッダを読み終えた', req.method, req.url);
  req.on('end', () => console.log('req end: ボディを読み終えた'));
  res.on('finish', () => console.log('res finish: レスポンスを OS に渡し終えた'));
  res.on('close', () => console.log('res close: レスポンスが閉じた'));
  req.resume(); // ボディを読む（読まないと 'end' が来ない）
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('ok\n');
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
