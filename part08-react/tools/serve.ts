// 第39章で使う、静かなファイルのサーバ（http://localhost:5173）。今いるフォルダのファイルを、そのまま返す
//   使い方: 配りたいフォルダで node ~/dev/part08/tools/serve.ts（止めるのは Ctrl+C）
// 第4部 第19章で作った静的ファイルのサーバと同じ考え方。第40章からは、代わりに Vite を使う
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT ?? 5173);
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

// http.createServer は、渡した関数の Promise を待たないので、async の関数を別に作って void で呼ぶ（第37章 6節）
async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let file = path.join(root, decodeURIComponent(url.pathname));
  // パストラバーサル（第4部 第19章）: root の外は見せない
  if (file !== root && !file.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    await stat(file);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('ありません');
    return;
  }
  // 書き換えたらすぐ見えるように、ブラウザに覚えさせない
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  createReadStream(file).pipe(res);
  console.log(`${req.method} ${url.pathname}`);
}

const server = http.createServer((req, res) => void handle(req, res));
server.listen(port, 'localhost', () => console.log(`http://localhost:${port}/ で ${root} を配っています（止めるのは Ctrl+C）`));
