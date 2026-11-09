// 練習問題6 の模範解答: static-server.mjs に、ETag・Last-Modified・Cache-Control と 304 を足したもの
// 使い方: node cached-static-server-basic.mjs [フォルダ] [ポート]   既定: ../exercises/public 8110
//   確かめ方（~/dev/ch07 で）: bash exercises/check-cache.sh solutions/cached-static-server-basic.mjs
//   （発展の問題10で足す 8・9・10・12 は、まだ NG のまま）
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] ?? fileURLToPath(new URL('../exercises/public', import.meta.url)));
const port = Number(process.argv[3] ?? 8110);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

http
  .createServer(async (req, res) => {
    console.log(`${req.method} ${req.url} ${req.headers['if-none-match'] ?? ''}`);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end();
      return;
    }
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.join(root, pathname);
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }

    let data;
    let stat;
    try {
      data = await fs.readFile(file);
      stat = await fs.stat(file); // 追加: 更新日時（stat.mtime）を知るため
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('見つかりません\n');
      return;
    }

    // 追加: キャッシュのためのヘッダ
    const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
    const etag = `"${crypto.createHash('sha256').update(data).digest('hex').slice(0, 16)}"`;
    const headers = {
      ETag: etag,
      'Last-Modified': stat.mtime.toUTCString(),
      'Cache-Control': type.startsWith('text/html') ? 'no-cache' : 'max-age=60',
    };

    // 追加: 手元のものと同じ版なら、ボディ無しの 304
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, headers);
      res.end();
      return;
    }

    headers['Content-Type'] = type;
    headers['Content-Length'] = data.length;
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : data);
  })
  .listen(port, '127.0.0.1', () => console.log(`http://localhost:${port}/ で ${root} を配信しています`));
