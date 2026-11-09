// 練習問題2 の模範解答: charset-server.mjs に /meta と /json を足したもの
// 使い方: node charset-server-v2.mjs        ブラウザで http://127.0.0.1:8101/meta と /json を開く
import http from 'node:http';

const html = '<!doctype html><title>実験</title><h1>こんにちは、世界</h1>\n';
// 問題2: ヘッダに charset が無くても、HTML の先頭の meta で文字コードを伝える
const htmlWithMeta = '<!doctype html><meta charset="utf-8"><title>実験</title><h1>こんにちは、世界</h1>\n';

const server = http.createServer((req, res) => {
  if (req.url === '/utf8') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  } else if (req.url === '/no-charset') {
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
  } else if (req.url === '/meta') {
    res.setHeader('Content-Type', 'text/html'); // ヘッダには charset を付けない
    res.end(htmlWithMeta);
  } else if (req.url === '/json') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ message: 'こんにちは' }));
  } else {
    res.statusCode = 404;
    res.end();
  }
});

server.listen(8101, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8101/ で待ち受けています');
});
