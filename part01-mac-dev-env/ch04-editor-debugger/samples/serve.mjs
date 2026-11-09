// 指定したフォルダのファイルを配信するだけの、小さな Web サーバ（第4章 11.3節）
// 使い方: node serve.mjs [配信するフォルダ] [ポート]   既定: カレントディレクトリ、8000
//
// Node.js の標準機能 node:http だけで書いている。第4部で、同じようなものを一から作る。
// 学習用なので、自分の Mac の中（localhost）からだけ接続できるようにしている。
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '.');
const port = Number(process.argv[3] ?? 8000);

// 拡張子から Content-Type を決める表（第2部・第4部で詳しく学ぶ）
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let filePath = path.join(root, decodeURIComponent(url.pathname));

  // 「../」を使って root の外のファイルを読まれないようにする（パストラバーサル対策）
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    if ((await stat(filePath)).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    const body = await readFile(filePath);
    const type = types[path.extname(filePath)] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(body);
    console.log(`200 ${req.method} ${url.pathname}`);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    console.log(`404 ${req.method} ${url.pathname}`);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`配信中: http://localhost:${port}/  （フォルダ: ${root}、Ctrl + C で終了）`);
});
