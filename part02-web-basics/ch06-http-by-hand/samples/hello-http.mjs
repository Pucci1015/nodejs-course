// node:http で書く HTTP サーバ（第6章 11節で書くものの完成形）
// 使い方: node hello-http.mjs        別のターミナルで: curl -v http://127.0.0.1:8086/
import http from 'node:http';

const server = http.createServer((req, res) => {
  const start = Date.now();
  // レスポンスを送り終えたら、1行ログを出す
  res.on('finish', () => {
    console.log(`${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms`);
  });

  if (req.method === 'GET' && req.url === '/') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(`こんにちは。あなたの User-Agent は ${req.headers['user-agent']} です\n`);
  } else if (req.method === 'POST' && req.url === '/echo') {
    // ボディは少しずつ届くので、'data' で集めて、'end' で返事をする
    req.setEncoding('utf8');
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(`受け取りました: ${body}\n`);
    });
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('見つかりません\n');
  }
});

server.listen(8086, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8086/ で待ち受けています');
});
