// 練習問題5: WebSocket のチャットのバグを直す（6か所）
// 仕様は exercises/README.md の問題5です。確かめ方:
//   $ node --test chat.test.mjs
// ブラウザで2つのタブを開いて試すぶんには、ちゃんと動きます（http://127.0.0.1:9349/chat.html）。
import path from 'node:path';
import express from 'express';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT ?? 9349);
const HEARTBEAT_MS = Number(process.env.HEARTBEAT_MS ?? 30_000);

const app = express();
app.disable('x-powered-by');
app.use(express.static(path.join(import.meta.dirname, '../samples/public')));

const clients = new Set();
app.get('/stats', (req, res) => res.json({ clients: clients.size }));

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${PORT}/chat.html を開いてください（Ctrl+C で止める）`);
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    const out = JSON.stringify({ type: 'chat', text: msg.text, at: new Date().toISOString() });
    for (const c of clients) c.send(out);
  });
});

console.log(`心拍の間隔: ${HEARTBEAT_MS}ms`);
