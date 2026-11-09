// 練習問題6 用: キャッシュの仕組みを持たない、小さな静的ファイルのサーバ
// 使い方: node static-server.mjs [フォルダ] [ポート]   既定: ./public 8110
// このファイルをコピーして cached-static-server.mjs を作り、ETag などを足す。
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath を使う。URL の pathname のままだと、日本語のフォルダ名が %E5... のようになってしまう
const root = path.resolve(process.argv[2] ?? fileURLToPath(new URL('./public', import.meta.url)));
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
    // root の外のファイルを読ませない（パストラバーサル対策。第4部 第19章）
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }

    let data;
    try {
      data = await fs.readFile(file);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('見つかりません\n');
      return;
    }

    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      'Content-Length': data.length,
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  })
  .listen(port, '127.0.0.1', () => console.log(`http://localhost:${port}/ で ${root} を配信しています`));
