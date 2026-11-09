// 安全に気をつけた、小さな静的ファイルのサーバ（第19章 3〜5節）
// 使い方: node static-server.mjs   → ブラウザで http://127.0.0.1:9191/
//   curl -i http://127.0.0.1:9191/style.css
//   curl -i --path-as-is 'http://127.0.0.1:9191/..%2Foutside.txt'   → 403
//   curl -i http://127.0.0.1:9191/.private-note.txt                 → 404
//   curl -i http://127.0.0.1:9191/docs                              → 308 で /docs/ へ
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createApp, HttpError } from '../../ch17-minimal-server/solutions/app.mjs';
import { contentType } from './mime.mjs';

const PORT = 9191;
const ROOT = path.join(import.meta.dirname, 'public');

function toFilePath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    throw new HttpError(400, 'URL の %xx の形が正しくありません');
  }
  if (decoded.includes('\0')) throw new HttpError(400, 'パスに使えない文字があります');
  const full = path.join(ROOT, decoded);
  // %xx を戻した「後」で、公開するフォルダの外を指していないか確かめる
  const rel = path.relative(ROOT, full);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new HttpError(403, 'このフォルダの外は開けません');
  // . で始まる名前は、あることも知らせない
  if (decoded.split('/').some((s) => s.startsWith('.'))) throw new HttpError(404, 'ありません');
  return full;
}

async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    throw new HttpError(405, 'このメソッドは使えません', { headers: { Allow: 'GET, HEAD' } });
  }
  const { pathname } = new URL(`http://localhost${req.url}`); // クエリは取り除く
  let file = toFilePath(pathname);

  let stat = await fs.stat(file).catch(() => null);
  if (stat?.isDirectory()) {
    if (!pathname.endsWith('/')) {
      // /docs → /docs/。最後の / が無いと、ページの中の相対パスがずれる（4.4節）
      res.writeHead(308, { Location: `${pathname}/`, 'Content-Length': 0 });
      res.end();
      return;
    }
    file = path.join(file, 'index.html');
    stat = await fs.stat(file).catch(() => null);
  }
  if (!stat?.isFile()) throw new HttpError(404, 'ありません');

  res.writeHead(200, {
    'Content-Type': contentType(file),
    'Content-Length': stat.size,
    'X-Content-Type-Options': 'nosniff',
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  if (stat.size === 0) {
    res.end();
    return;
  }
  // 全部を読んでから返すのではなく、少しずつ流す。
  // end（最後のバイトの位置）を教えておくと、最後まで読んだところで、すぐに終わりにできる
  const fh = await fs.open(file);
  try {
    await pipeline(fh.createReadStream({ start: 0, end: stat.size - 1 }), res);
  } catch (err) {
    // 客が先に切った（ERR_STREAM_PREMATURE_CLOSE）なら、することは無い
    if (err.code !== 'ERR_STREAM_PREMATURE_CLOSE') throw err;
  }
}

const server = http.createServer(createApp(handler));
server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（公開するフォルダ: ${ROOT}）`));
