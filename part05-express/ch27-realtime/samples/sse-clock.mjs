// 第27章 3節で書く、SSE で1秒ごとに時刻を送るサーバの完成形
// 使い方（~/dev/part05/ch27-realtime で）: node samples/sse-clock.mjs
//   別のターミナルで curl -N http://127.0.0.1:9347/clock （Ctrl+C で止める）
import express from 'express';

const PORT = 9347;
const app = express();
app.disable('x-powered-by');

let clients = 0;

app.get('/clock', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.write('retry: 3000\n\n'); // 切れたら 3 秒後につなぎ直してほしい

  let id = 0;
  const timer = setInterval(() => {
    id += 1;
    const data = JSON.stringify({ now: new Date().toISOString() });
    res.write(`event: tick\ndata: ${data}\nid: ${id}\n\n`);
  }, 1000);

  clients += 1;
  console.log(`つながりました（今 ${clients} 人）`);
  req.on('close', () => {
    clearInterval(timer); // 片付けないと、だれもいないのに書き続ける
    clients -= 1;
    console.log(`切れました（今 ${clients} 人）`);
  });
});

app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/clock で待っています`));
