// 第27章 2節で書く、ロングポーリングのサーバの完成形
// 使い方（~/dev/part05/ch27-realtime で）: node samples/long-wait.mjs
//   別のターミナルで curl -s 'http://127.0.0.1:9347/api/messages/wait?since=0' と打って待たせ、
//   もう1つのターミナルで curl -s -H 'Content-Type: application/json' -d '{"text":"やあ"}' http://127.0.0.1:9347/api/messages
import { EventEmitter } from 'node:events';
import express from 'express';

const PORT = 9347;
const bus = new EventEmitter(); // 「新しいメッセージが来た」を知らせる
const messages = [];

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.post('/api/messages', (req, res) => {
  const message = { id: messages.length + 1, text: String(req.body?.text ?? '') };
  messages.push(message);
  bus.emit('message', message);
  res.status(201).json(message);
});

app.get('/api/messages/wait', (req, res) => {
  const since = Number(req.query.since ?? 0);
  const newer = messages.filter((m) => m.id > since);
  if (newer.length > 0) return res.json(newer); // もうあれば、すぐに返す

  let done = false;
  const onMessage = (message) => finish(() => res.json([message]));
  const timer = setTimeout(() => finish(() => res.sendStatus(204)), 10_000); // 10 秒来なければ 204

  function finish(send) {
    if (done) return;
    done = true;
    clearTimeout(timer); // 片付け 1: タイマー
    bus.off('message', onMessage); // 片付け 2: listener
    send();
    console.log(`待っている人: ${bus.listenerCount('message')}`);
  }

  bus.on('message', onMessage);
  req.on('close', () => finish(() => {})); // 客が先に切ったら、何も送らずに片付ける
  console.log(`待っている人: ${bus.listenerCount('message')}`);
});

app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
