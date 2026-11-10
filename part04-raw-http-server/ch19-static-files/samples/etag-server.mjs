// 第19章 6節で書く、ETag を付けて、変わっていなければ 304 を返すサーバの完成形
// 使い方（~/dev/part04/ch19-static-files で）: node samples/etag-server.mjs
//   別のターミナルで: curl -i http://127.0.0.1:9196/
//                     curl -i -H 'If-None-Match: "（上で返った ETag）"' http://127.0.0.1:9196/   → 304
import crypto from 'node:crypto';
import http from 'node:http';

const PORT = 9196;
const body = 'ETag の練習用のページです\n';
// 中身のハッシュ（SHA-256）の最初の16文字を、中身の目印にする。中身が変われば、目印も変わる
const etag = `"${crypto.createHash('sha256').update(body).digest('hex').slice(0, 16)}"`;

const server = http.createServer((req, res) => {
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'no-cache'); // 使う前に毎回「変わった？」と聞いてもらう
  if (req.headers['if-none-match'] === etag) {
    res.statusCode = 304; // 変わっていない。本文は送らない
    res.end();
    return;
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(body);
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（ETag ${etag}）`));
