// 練習問題5: 静的ファイルのサーバ。ブラウザで開くと、それらしく見えますが、バグがたくさんあります
// 確かめる: bash check-static.sh
// 使い方: node buggy-static.mjs   → http://127.0.0.1:9195/   （公開するフォルダは ../samples/public）
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const PORT = Number(process.env.PORT ?? 9195);
const ROOT = path.join(import.meta.dirname, '..', 'samples', 'public');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.txt': 'text/plain',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  let file = path.join(ROOT, decodeURIComponent(req.url));
  if (file.endsWith('/')) file += 'index.html';
  console.log(`${req.method} ${req.url} → ${path.relative(ROOT, file)}`);

  fs.stat(file, (err, stat) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('ありません\n');
      return;
    }
    // ブラウザのキャッシュが If-Modified-Since を送ってきたら、変わっていない
    if (req.headers['if-modified-since']) {
      res.writeHead(304);
      res.end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'text/plain',
      'Last-Modified': stat.mtime.toUTCString(),
      'X-Content-Type-Options': 'nosniff',
    });
    fs.createReadStream(file).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
