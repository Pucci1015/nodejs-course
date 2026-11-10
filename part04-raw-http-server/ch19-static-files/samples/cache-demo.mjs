// キャッシュのためのヘッダと、304 Not Modified（第19章 6節）
// 使い方: node cache-demo.mjs
//   curl -i http://127.0.0.1:9192/no-cache
//   curl -i -H 'If-None-Match: <上で返った ETag>' http://127.0.0.1:9192/no-cache   → 304
//   ブラウザで http://127.0.0.1:9192/ を開き、DevTools の Network で、再読み込みしたときの違いを見る
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const PORT = 9192;
const FILE = path.join(import.meta.dirname, 'public', 'style.css');

// どのパスで、どの Cache-Control を付けるか
const policies = {
  '/no-cache': 'no-cache', // 使う前に、毎回サーバに「変わった？」と聞く
  '/max-age': 'max-age=60', // 60 秒は聞かずに使う
  '/no-store': 'no-store', // 保存しない
  '/immutable': 'public, max-age=31536000, immutable', // 1年。名前に中身のハッシュを入れたファイル用
};

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(`http://localhost${req.url}`);
  if (pathname === '/') {
    const links = Object.keys(policies).map((p) => `<li><a href="${p}">${p}</a>（${policies[p]}）</li>`).join('');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(`<!doctype html><meta charset="utf-8"><title>cache</title><ul>${links}</ul>`);
    return;
  }
  const policy = policies[pathname];
  if (!policy) {
    res.writeHead(404).end();
    return;
  }
  const body = await fs.readFile(FILE);
  const stat = await fs.stat(FILE);
  // 中身のハッシュから作る、強い ETag。中身が1バイトでも変われば変わる
  const etag = `"${crypto.createHash('sha256').update(body).digest('base64url').slice(0, 16)}"`;
  const headers = { 'Cache-Control': policy, ETag: etag, 'Last-Modified': stat.mtime.toUTCString() };

  const inm = req.headers['if-none-match'];
  const ims = req.headers['if-modified-since'];
  const fresh = inm !== undefined ? inm === etag : ims !== undefined && Math.floor(stat.mtimeMs / 1000) * 1000 <= Date.parse(ims);
  console.log(`${req.method} ${pathname} If-None-Match=${inm ?? '-'} If-Modified-Since=${ims ?? '-'} → ${fresh ? 304 : 200}`);
  if (fresh) {
    res.writeHead(304, headers);
    res.end();
    return;
  }
  res.writeHead(200, { ...headers, 'Content-Type': 'text/css; charset=utf-8', 'Content-Length': body.length });
  res.end(body);
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
