// 1つのリクエストの一生を、イベントで見る（第17章 3節）
// 使い方: node lifecycle-demo.mjs
//   別のターミナルで:
//   curl -s http://127.0.0.1:9171/a http://127.0.0.1:9171/b        （1つの接続で2つ。keep-alive）
//   curl -s -d 'name=alice' http://127.0.0.1:9171/form              （ボディのあるリクエスト）
//   curl -s --max-time 0.5 http://127.0.0.1:9171/slow                （返す前に、客が先に切る）
import http from 'node:http';

const PORT = 9171;
let connNo = 0;
let reqNo = 0;
const t0 = Date.now();
const log = (...a) => console.log(`${String(Date.now() - t0).padStart(5)}ms`, ...a);

const server = http.createServer(async (req, res) => {
  const id = ++reqNo;
  const conn = req.socket.connNo;
  log(`[接続${conn}] リクエスト${id}: ${req.method} ${req.url}（ヘッダを読み終えたところ）`);

  // ボディは、まだ届いていないかもしれない。req は Readable なので、読むと届く
  let bytes = 0;
  req.on('data', (chunk) => {
    bytes += chunk.length;
    log(`[接続${conn}] リクエスト${id}: ボディのチャンク ${chunk.length} バイト`);
  });
  req.on('end', () => log(`[接続${conn}] リクエスト${id}: ボディの終わり（合計 ${bytes} バイト）`));

  res.on('finish', () => log(`[接続${conn}] リクエスト${id}: レスポンスを OS に渡し終えた（finish）`));
  res.on('close', () => log(`[接続${conn}] リクエスト${id}: レスポンスが閉じた（close）。終わりまで書けたか: ${res.writableFinished}`));

  if (req.url === '/slow') await new Promise((r) => setTimeout(r, 2000));
  if (res.destroyed) {
    log(`[接続${conn}] リクエスト${id}: 客はもういないので、返さない`);
    return;
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(`リクエスト${id}（接続${conn}）\n`);
});

server.on('connection', (socket) => {
  socket.connNo = ++connNo;
  log(`[接続${socket.connNo}] TCP の接続ができた（${socket.remoteAddress}:${socket.remotePort}）`);
  socket.on('close', () => log(`[接続${socket.connNo}] TCP の接続が閉じた`));
});

server.listen(PORT, '127.0.0.1', () => log(`http://127.0.0.1:${PORT}/ で待っています`));
