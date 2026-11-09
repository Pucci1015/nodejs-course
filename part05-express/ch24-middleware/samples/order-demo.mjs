// ミドルウェアが動く順番（第24章 2節）
//   $ node order-demo.mjs
//   別のターミナルで:
//     curl -s http://127.0.0.1:9310/hello
//     curl -s http://127.0.0.1:9310/admin/users/7
//     curl -s http://127.0.0.1:9310/skip/1     curl -s http://127.0.0.1:9310/skip/2
//   サーバのターミナルに、どのミドルウェアがどの順で動いたかが出る
import express from 'express';

const app = express();
const log = (...args) => console.log('  ', ...args);

// 1. すべてのリクエストで動く（パスを書かない app.use は、/ と同じ）
app.use((req, res, next) => {
  console.log(`--- ${req.method} ${req.originalUrl}`);
  log('A: いちばん前');
  next(); // 次へ進む。呼ばなければ、ここで止まる（応答もしないなら、客は待たされ続ける）
  log('A: next() の後（後ろの処理が「同期的に」終わった後に、ここに戻る）');
});

// 2. /admin で始まるパスだけで動く。中では req.url から /admin が取り除かれる
app.use('/admin', (req, res, next) => {
  log(`B: /admin の中 req.url=${req.url} req.baseUrl=${req.baseUrl} req.originalUrl=${req.originalUrl}`);
  next();
});

app.get('/hello', (req, res) => {
  log('C: GET /hello のハンドラ');
  res.send('hello\n');
});

app.get('/admin/users/:id', (req, res) => {
  log(`D: GET /admin/users/:id のハンドラ id=${req.params.id}`);
  res.send(`user ${req.params.id}\n`);
});

// 3. next('route') は「このルートの残りのハンドラを飛ばして、次のルートへ」
app.get(
  '/skip/:n',
  (req, res, next) => {
    log('E1: 1つ目のハンドラ');
    if (req.params.n === '1') return next('route');
    next();
  },
  (req, res) => {
    log('E2: 同じルートの2つ目のハンドラ');
    res.send('E2\n');
  },
);
app.get('/skip/:n', (req, res) => {
  log('F: 次のルート');
  res.send('F\n');
});

app.listen(9310, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9310/ で待っています（Ctrl+C で止める）');
});
