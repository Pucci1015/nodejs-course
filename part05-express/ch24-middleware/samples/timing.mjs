// 第24章 4節で書く、応答の後にアクセスログを書くミドルウェアの完成形
// 使い方（~/dev/part05/ch24-middleware で）: node samples/timing.mjs
//   curl で: curl -s http://127.0.0.1:9317/fast   curl -s --max-time 0.3 http://127.0.0.1:9317/slow
import express from 'express';

const PORT = 9317;
const app = express();
app.disable('x-powered-by');

function timing(req, res, next) {
  const start = performance.now();
  res.once('close', () => {
    const ms = (performance.now() - start).toFixed(1);
    const status = res.writableFinished ? res.statusCode : 'aborted';
    console.log(`${req.method} ${req.originalUrl} ${status} ${ms}ms`);
  });
  next();
}

app.use(timing);

app.get('/fast', (req, res) => res.send('fast\n'));
app.get('/slow', async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  res.send('slow\n');
});

app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
