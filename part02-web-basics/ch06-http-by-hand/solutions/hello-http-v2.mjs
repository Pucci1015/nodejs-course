// 練習問題4 の模範解答: 本文11節の hello-http.mjs に、/hello-ja と /headers を足したもの
// 使い方: node hello-http-v2.mjs        別のターミナルで: curl -i http://127.0.0.1:8086/headers
import http from 'node:http';

const server = http.createServer((req, res) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms`);
  });

  if (req.method === 'GET' && req.url === '/') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(`こんにちは。あなたの User-Agent は ${req.headers['user-agent']} です\n`);
  } else if (req.method === 'GET' && req.url === '/hello-ja') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('こんにちは\n');
  } else if (req.method === 'GET' && req.url === '/headers') {
    // 届いたヘッダを、JSON にして返す。null, 2 は「2文字ずつ字下げして読みやすくする」
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(`${JSON.stringify(req.headers, null, 2)}\n`);
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('見つかりません\n');
  }
});

server.listen(8086, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8086/ で待ち受けています');
});
