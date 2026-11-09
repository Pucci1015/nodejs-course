// 文字コードの実験をするサーバ（第7章 2.3節で書くものの完成形）
// 使い方: node charset-server.mjs        ブラウザで http://127.0.0.1:8101/utf8 と /no-charset を開く
import http from 'node:http';

const html = '<!doctype html><title>実験</title><h1>こんにちは、世界</h1>\n';

const server = http.createServer((req, res) => {
  if (req.url === '/utf8') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8'); // 文字コードを伝える
    res.end(html);
  } else if (req.url === '/no-charset') {
    res.setHeader('Content-Type', 'text/html'); // 文字コードを伝えない → ブラウザが推測する
    res.end(html);
  } else {
    res.statusCode = 404;
    res.end();
  }
});

server.listen(8101, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8101/utf8 と /no-charset で待ち受けています');
});
