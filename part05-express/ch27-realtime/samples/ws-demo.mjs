// ws ライブラリで、小さなチャット（第27章 4節）
//   $ node samples/ws-demo.mjs
//   ブラウザで http://127.0.0.1:9343/chat.html を2つのタブで開いてください
//   ほかのオリジンからの接続を断ることを確かめる（403）:
//     curl -si -H 'Origin: https://evil.example' -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' http://127.0.0.1:9343/ws --max-time 1
import path from 'node:path';
import express from 'express';
import { WebSocketServer } from 'ws';

const ALLOWED_ORIGINS = new Set(['http://127.0.0.1:9343', 'http://localhost:9343']);
const HEARTBEAT_MS = 30_000;

const app = express();
app.disable('x-powered-by');
app.use(express.static(path.join(import.meta.dirname, 'public')));
const server = app.listen(9343, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9343/chat.html を開いてください（Ctrl+C で止める）');
});

// noServer: Express の HTTP サーバの 'upgrade' を自分で受けて、確かめてから渡す
const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 }); // 1つのメッセージは 16 KiB まで（既定は 100 MiB）

server.on('upgrade', (req, socket, head) => {
  // WebSocket には CORS が無い。ほかのサイトのページからも、Cookie つきでつなげてしまうので、Origin を自分で確かめる
  const origin = req.headers.origin;
  if (new URL(req.url, 'http://x').pathname !== '/ws' || !ALLOWED_ORIGINS.has(origin)) {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

function broadcast(obj) {
  const text = JSON.stringify(obj);
  for (const c of wss.clients) if (c.readyState === c.OPEN) c.send(text);
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true)); // ping への返事が来たら、生きている
  broadcast({ type: 'system', text: `だれかが入りました（今 ${wss.clients.size} 人）` });

  ws.on('message', (raw, isBinary) => {
    // 届いたものは、信じずに確かめる。JSON.parse の失敗で、プロセスごと落とさない
    let msg;
    try {
      msg = isBinary ? null : JSON.parse(raw.toString());
    } catch {
      msg = null;
    }
    if (!msg || msg.type !== 'chat' || typeof msg.text !== 'string' || msg.text.trim() === '' || msg.text.length > 500) {
      ws.send(JSON.stringify({ type: 'error', text: '{"type":"chat","text":"…"}（500 文字まで）の形で送ってください' }));
      return;
    }
    broadcast({ type: 'chat', text: msg.text.trim(), at: new Date().toISOString() });
  });
  ws.on('close', () => broadcast({ type: 'system', text: `だれかが出ました（今 ${wss.clients.size} 人）` }));
});

// 心拍: 決まった間隔で ping を送り、前の ping に返事が無かったものは切る（電波が切れた客は、close が来ないことがある）
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
