// 練習問題10 の模範解答: 問題6の cached-static-server-basic.mjs に、ETag の比較の決まりと If-Modified-Since を足したもの
// 使い方: node cached-static-server.mjs [フォルダ] [ポート]   既定: ../exercises/public 8110
//   確かめ方（~/dev/ch07 で）: bash exercises/check-cache.sh solutions/cached-static-server.mjs
//   問題10で足したところには「問題10:」のコメントがある
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

// 問題10: If-None-Match（例: '"a", W/"b"'）の中に、etag と一致するものがあるか
function noneMatchHits(header, etag) {
  if (header.trim() === '*') return true; // * は何にでも一致する
  for (let tag of header.split(',')) {
    tag = tag.trim();
    if (tag.startsWith('W/')) tag = tag.slice(2); // 弱い比較: 先頭の W/ を取り除いてから比べる
    if (tag === etag) return true;
  }
  return false;
}

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
    const inm = req.headers['if-none-match'];
    const ims = req.headers['if-modified-since'];
    let notModified = false;
    if (inm !== undefined) {
      notModified = noneMatchHits(inm, etag); // 問題10: 弱い比較・複数・* に対応
    } else if (ims !== undefined) {
      // 問題10: If-None-Match が無いときだけ If-Modified-Since を見る。HTTP の日付は秒までなので、秒にそろえて比べる
      const fileSec = Math.floor(stat.mtime.getTime() / 1000);
      const sinceSec = Math.floor(new Date(ims).getTime() / 1000);
      notModified = fileSec <= sinceSec;
    }
    if (notModified) {
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
