// ポーリングとロングポーリングを比べる（第27章 2節）
//   $ node polling-demo.mjs
//   別のターミナルで:
//     curl -s 'http://127.0.0.1:9340/api/events?since=0'          ← すぐに返る（新しいものが無ければ空）
//     curl -s 'http://127.0.0.1:9340/api/events/wait?since=0'     ← 新しいものが来るまで待つ（最長 25 秒）
//   さらに別のターミナルで:
//     curl -s -X POST -H 'Content-Type: application/json' -d '{"text":"こんにちは"}' http://127.0.0.1:9340/api/events
//   待っていた curl が、すぐに返ります
import { EventEmitter } from 'node:events';
import express from 'express';

const events = []; // { id, text, at }
const bus = new EventEmitter();
bus.setMaxListeners(1000); // 待っている客の数だけ listener が増えるため

const app = express();
app.disable('x-powered-by');
app.use(express.json());

const since = (req) => Number.parseInt(String(req.query.since ?? '0'), 10) || 0;
const after = (id) => events.filter((e) => e.id > id);

// ポーリング: 今あるものを、すぐに返す。客は数秒ごとに聞き直す
app.get('/api/events', (req, res) => {
  res.json({ items: after(since(req)) });
});

// ロングポーリング: 新しいものが無ければ、来るまで（最長 25 秒）応答を返さずに待つ
app.get('/api/events/wait', (req, res) => {
  const id = since(req);
  const now = after(id);
  if (now.length > 0) return res.json({ items: now });

  const onEvent = () => finish(200);
  const timer = setTimeout(() => finish(204), 25_000); // 来なければ 204。客はすぐに聞き直す
  function finish(status) {
    clearTimeout(timer);
    bus.off('event', onEvent); // 外し忘れると、切れた客の listener がたまっていく
    if (res.headersSent || res.destroyed) return;
    if (status === 204) return res.sendStatus(204);
    res.json({ items: after(id) });
  }
  bus.on('event', onEvent);
  req.on('close', () => finish(0)); // 客が先に切ったら、待つのをやめる（res.destroyed なので何も送らない）
});

app.post('/api/events', (req, res) => {
  const text = String(req.body?.text ?? '').slice(0, 200);
  const e = { id: (events.at(-1)?.id ?? 0) + 1, text, at: new Date().toISOString() };
  events.push(e);
  console.log(`event ${e.id}: 待っていた客 ${bus.listenerCount('event')} 人に知らせます`);
  bus.emit('event');
  res.status(201).json(e);
});

app.listen(9340, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9340/ で待っています（Ctrl+C で止める）');
});
