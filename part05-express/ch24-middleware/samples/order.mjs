// 第24章 2節で書く、ミドルウェアが動く順番を確かめるアプリの完成形
// 使い方（~/dev/part05/ch24-middleware で）: node samples/order.mjs → curl -s http://127.0.0.1:9317/admin/users/7
import express from 'express';

const PORT = 9317;
const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  console.log(`--- ${req.method} ${req.originalUrl}`);
  console.log('A: いちばん前');
  next();
  console.log('A: next() の後');
});

app.use('/admin', (req, res, next) => {
  console.log(`B: /admin の中 req.url=${req.url} req.baseUrl=${req.baseUrl}`);
  next();
});

app.get('/admin/users/:id', (req, res) => {
  console.log('C: ハンドラ');
  res.send(`user ${req.params.id}\n`);
});

app.get('/hello', (req, res) => {
  console.log('C: ハンドラ');
  res.send('hello\n');
});

app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
