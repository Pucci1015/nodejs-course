// 第23章 8節で書く、404 とエラーを JSON で返すアプリの完成形
// 使い方（~/dev/part05/ch23-express-intro で）: node samples/errors.mjs
//   curl で: curl -i http://127.0.0.1:9307/boom   curl -i http://127.0.0.1:9307/nothing
import express from 'express';

const PORT = 9307;
const app = express();
app.disable('x-powered-by');

app.get('/boom', async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  throw new Error('DB に接続できません: 秘密の接続先'); // 客に見せてはいけない文
});

app.get('/teapot', (req, res) => {
  const err = new Error('ティーポットなのでコーヒーは入れられません');
  err.status = 418;
  throw err;
});

// どのルートにもあてはまらなかったとき。ルートをすべて書いた後に置く
app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: `${req.method} ${req.path} はありません` });
});

// エラーハンドラ。いちばん最後に置き、引数は必ず4つ
app.use((err, req, res, next) => {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err); // 詳しいことはサーバのログにだけ
  if (res.headersSent) return next(err);
  res.status(status).json({
    error: status >= 500 ? 'internal' : 'error',
    message: status >= 500 ? 'サーバのエラーです' : err.message,
  });
});

app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
