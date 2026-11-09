// 練習問題5の模範解答: WebSocket のチャット
// 確かめ方（exercises の中で）: MODULE=../solutions/chat.mjs node --test chat.test.mjs
import path from 'node:path';
import express from 'express';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT ?? 9349);
const HEARTBEAT_MS = Number(process.env.HEARTBEAT_MS ?? 30_000);
// 追加: つないでよいページのオリジン
const ALLOWED_ORIGINS = new Set((process.env.ALLOWED_ORIGINS ?? `http://127.0.0.1:${PORT},http://localhost:${PORT}`).split(','));

const app = express();
app.disable('x-powered-by');
app.use(express.static(path.join(import.meta.dirname, '../samples/public')));

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${PORT}/chat.html を開いてください（Ctrl+C で止める）`);
});

// 修正: 1つのメッセージの大きさを決める（既定は 100 MiB）。超えたら ws が 1009 で閉じる
const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
// 修正: 自分の Set を作らず、ws が持っている wss.clients を使う（閉じたものは ws が外す）
app.get('/stats', (req, res) => res.json({ clients: wss.clients.size }));

// 修正: WebSocket には CORS が無い。ほかのサイトのページから、Cookie つきでつながれないように Origin を確かめる
server.on('upgrade', (req, socket, head) => {
  if (new URL(req.url, 'http://x').pathname !== '/ws' || !ALLOWED_ORIGINS.has(req.headers.origin)) {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

const send = (ws, obj) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(obj));

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));
  ws.on('error', () => {}); // 1009 などで閉じるときの error で、プロセスを落とさない

  ws.on('message', (raw, isBinary) => {
    // 修正: JSON.parse の例外は、ここで受け止める。'message' の中で投げると、プロセスごと落ちる
    let msg;
    try {
      msg = isBinary ? undefined : JSON.parse(raw.toString());
    } catch {
      msg = undefined;
    }
    // 修正: 形を確かめる。text は 1〜500 文字の文字列
    const text = typeof msg?.text === 'string' ? msg.text.trim() : '';
    if (msg?.type !== 'chat' || text.length < 1 || text.length > 500) {
      send(ws, { type: 'error', text: '{"type":"chat","text":"…"}（1〜500 文字）の形で送ってください' });
      return;
    }
    const out = { type: 'chat', text, at: new Date().toISOString() };
    for (const c of wss.clients) send(c, out);
  });
});

// 追加: 心拍。返事の無い接続は切る（電波が切れた客は close が来ないので、いつまでも残る）
const timer = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, HEARTBEAT_MS);
wss.on('close', () => clearInterval(timer));
