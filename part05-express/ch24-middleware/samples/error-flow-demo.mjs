// next(err) と、エラーハンドラの流れ（第24章 3節）
//   $ node error-flow-demo.mjs
//   別のターミナルで:
//     curl -s http://127.0.0.1:9311/ok          curl -s http://127.0.0.1:9311/fail
//     curl -s http://127.0.0.1:9311/not-found   curl -s http://127.0.0.1:9311/recover
import express from 'express';

const app = express();
const log = (...args) => console.log('  ', ...args);

app.use((req, res, next) => {
  console.log(`--- ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/ok', (req, res) => res.send('ok\n'));

app.get('/fail', (req, res, next) => {
  log('ハンドラ: next(err) を呼ぶ');
  next(new Error('失敗しました'));
});

// next(err) の後は、ふつうのミドルウェア（引数3つ）は飛ばされる
app.use((req, res, next) => {
  log('ふつうのミドルウェア（エラーのときは呼ばれない）');
  next();
});

app.get('/recover', (req, res, next) => {
  const err = new Error('回復できるエラー');
  err.recoverable = true;
  next(err);
});

// エラーハンドラは、いくつでもつなげられる。next(err) で次のエラーハンドラへ渡す
app.use((err, req, res, next) => {
  log(`エラーハンドラ1: ${err.message}（ログに書いて、次へ渡す）`);
  next(err);
});

app.use((err, req, res, next) => {
  if (err.recoverable) {
    log('エラーハンドラ2: 回復して、ふつうに返す');
    return res.status(200).send('回復しました\n');
  }
  next(err);
});

// 404: ここまで来たのは、どのルートも答えなかったリクエスト（エラーではない）
app.use((req, res) => {
  log('404 のミドルウェア');
  res.status(404).send('ありません\n');
});

app.use((err, req, res, next) => {
  log(`最後のエラーハンドラ: ${err.message}`);
  res.status(500).send('サーバのエラー\n');
});

app.listen(9311, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9311/ で待っています（Ctrl+C で止める）');
});
