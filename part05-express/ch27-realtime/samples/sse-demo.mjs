// Server-Sent Events（第27章 3節）
//   $ node sse-demo.mjs
//   ブラウザで http://127.0.0.1:9341/sse.html を2つのタブで開き、片方から送ってみてください
//   curl で見るとき（-N は「ためずに、届いたらすぐ出す」）:
//     curl -N http://127.0.0.1:9341/events
//     curl -N -H 'Last-Event-ID: 2' http://127.0.0.1:9341/events     ← 3 番から後を送り直してもらう
//     curl -s -X POST -H 'Content-Type: application/json' -d '{"text":"こんにちは"}' http://127.0.0.1:9341/messages
import path from 'node:path';
import express from 'express';

const HISTORY = 50; // 送り直しのために覚えておく数
const history = []; // { id, data }
const clients = new Set(); // 今つながっている res
let lastId = 0;

/** 1つのイベントを、SSE の形の文字列にする。data の中の改行は、data: の行を分ける */
function format({ id, event, data }) {
  let s = '';
  if (event) s += `event: ${event}\n`;
  for (const line of String(data).split(/\r\n|\r|\n/)) s += `data: ${line}\n`;
  if (id !== undefined) s += `id: ${id}\n`;
  return `${s}\n`; // 空の行で、1つのイベントの終わり
}

const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use(express.static(path.join(import.meta.dirname, 'public')));

app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache', // 途中のキャッシュにためさせない
    Connection: 'keep-alive',
  });
  res.write('retry: 3000\n\n'); // 切れたら 3 秒後につなぎ直して、と伝える

  // つなぎ直した客は、最後に受け取った id を Last-Event-ID で送ってくる。その後のものを送り直す
  const last = Number.parseInt(req.get('last-event-id') ?? '', 10);
  if (Number.isInteger(last)) for (const m of history.filter((x) => x.id > last)) res.write(format({ id: m.id, event: 'message', data: m.data }));

  clients.add(res);
  console.log(`つながりました（今 ${clients.size} 人）`);
  // 何も送らない時間が続くと、途中のプロキシに切られることがあるので、コメント（: で始まる行）を送る
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 15_000);
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
    console.log(`切れました（今 ${clients.size} 人）`);
  });
});

app.post('/messages', (req, res) => {
  const text = String(req.body?.text ?? '').trim().slice(0, 200);
  if (!text) return res.status(422).json({ error: 'text を入力してください' });
  const m = { id: ++lastId, data: JSON.stringify({ text, at: new Date().toISOString() }) };
  history.push(m);
  if (history.length > HISTORY) history.shift();
  for (const c of clients) c.write(format({ id: m.id, event: 'message', data: m.data }));
  res.status(201).json({ id: m.id });
});

app.listen(9341, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9341/sse.html を開いてください（Ctrl+C で止める）');
});
