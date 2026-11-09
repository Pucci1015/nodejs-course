// Range: ファイルの一部だけを返す（第19章 7節）
// 使い方: node range-demo.mjs
//   curl -i -r 0-8 http://127.0.0.1:9193/hello.txt       → 206 と最初の 9 バイト
//   curl -i -r 1000-2000 http://127.0.0.1:9193/hello.txt → 416
// 形の確かめ方は簡単にしてある（bytes=始め-終わり の1つだけ）。きちんとした読み方は練習問題4
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const PORT = 9193;
const FILE = path.join(import.meta.dirname, 'public', 'hello.txt');

const server = http.createServer(async (req, res) => {
  const body = await fs.readFile(FILE);
  const size = body.length;
  const m = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? '');
  console.log(`${req.method} ${req.url} Range=${req.headers.range ?? '-'}`);
  if (!m) {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': size, 'Accept-Ranges': 'bytes' });
    res.end(body);
    return;
  }
  const start = Number(m[1]);
  const end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (start >= size || end < start) {
    res.writeHead(416, { 'Content-Range': `bytes */${size}` });
    res.end();
    return;
  }
  res.writeHead(206, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Range': `bytes ${start}-${end}/${size}`,
    'Content-Length': end - start + 1,
    'Accept-Ranges': 'bytes',
  });
  res.end(body.subarray(start, end + 1));
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
