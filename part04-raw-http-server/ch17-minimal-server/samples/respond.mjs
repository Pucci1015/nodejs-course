// 第17章 4節で書く、テキストと JSON を返し分けるサーバの完成形
// 使い方（~/dev/part04/ch17-minimal-server で）: node samples/respond.mjs
//   別のターミナルで: curl -i http://127.0.0.1:9179/text
//                     curl -i http://127.0.0.1:9179/json
//                     curl -i http://127.0.0.1:9179/nai
import http from 'node:http';

const PORT = 9179;

const server = http.createServer((req, res) => {
  if (req.url === '/text') {
    const body = 'こんにちは\n';
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(body)); // 文字数ではなくバイト数
    res.end(body);
    return; // 返したら、ここで終わる
  }
  if (req.url === '/json') {
    const body = JSON.stringify({ message: 'こんにちは', time: new Date().toISOString() });
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
    return;
  }
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('見つかりません\n');
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
