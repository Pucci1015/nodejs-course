// 第27章 4節で書く、ws で受け取ったものを全員に配るサーバの完成形
// 使い方（~/dev/part05/ch27-realtime で）: node samples/ws-echo.mjs
//   別のターミナルで node samples/ws-client.mjs こんにちは
import express from 'express';
import { WebSocketServer } from 'ws';

const PORT = 9347;
const ALLOWED_ORIGINS = new Set([`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`]);

const app = express();
app.disable('x-powered-by');
const server = app.listen(PORT, '127.0.0.1', () => console.log(`ws://127.0.0.1:${PORT}/ws で待っています`));

const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 }); // 1つのメッセージは 16 KiB まで

server.on('upgrade', (req, socket, head) => {
  if (req.url !== '/ws' || !ALLOWED_ORIGINS.has(req.headers.origin)) {
    console.log(`断りました: ${req.url} Origin=${req.headers.origin}`);
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

wss.on('connection', (ws) => {
  console.log(`つながりました（今 ${wss.clients.size} 人）`);
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: 'error', text: 'JSON ではありません' })); // 落ちずに、送った人にだけ返す
      return;
    }
    if (typeof msg?.text !== 'string') {
      ws.send(JSON.stringify({ type: 'error', text: 'text がありません' }));
      return;
    }
    for (const client of wss.clients) {
      client.send(JSON.stringify({ type: 'chat', text: msg.text }));
    }
  });
  ws.on('close', () => console.log(`切れました（今 ${wss.clients.size} 人）`));
});
