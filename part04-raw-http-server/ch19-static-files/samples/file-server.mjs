// 第19章 5節で書く、public フォルダのファイルを少しずつ流して返すサーバの完成形
// 使い方（~/dev/part04/ch19-static-files で）: node samples/file-server.mjs
//   別のターミナルで: curl -i http://127.0.0.1:9196/hello.txt
//                     curl -i --path-as-is 'http://127.0.0.1:9196/..%2Foutside.txt'   → 403
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

const PORT = 9196;
const ROOT = path.resolve('samples/public');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function sendText(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': Buffer.byteLength(text) });
  res.end(text);
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(`http://localhost${req.url}`);
  let decoded;
  try {
    decoded = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  } catch {
    return sendText(res, 400, '%xx の形が正しくありません\n');
  }
  const file = path.join(ROOT, decoded);
  const rel = path.relative(ROOT, file);
  if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) {
    return sendText(res, 403, 'このフォルダの外は開けません\n');
  }

  let stat;
  try {
    stat = await fs.promises.stat(file);
  } catch {
    return sendText(res, 404, '見つかりません\n');
  }
  if (!stat.isFile()) return sendText(res, 404, '見つかりません\n');

  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': stat.size,
    'X-Content-Type-Options': 'nosniff',
  });
  try {
    await pipeline(fs.createReadStream(file), res); // 少しずつ読んで、少しずつ送る
  } catch (err) {
    if (err.code !== 'ERR_STREAM_PREMATURE_CLOSE') console.error(err); // 客が先に切ったのは、エラーではない
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
