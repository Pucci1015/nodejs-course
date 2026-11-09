// 練習問題1: ミドルウェアが動く順番を予想する
// 実行する前に、リクエスト 1〜6 のそれぞれで「どの文字が、どの順で記録されるか」と「客が受け取る本文」を予想してください。
//   $ node predict-order.mjs
import express from 'express';

const app = express();
app.set('env', 'test'); // 既定のエラーハンドラがスタックを書かないように
let trace = [];
const t = (s) => trace.push(s);

app.use((req, res, next) => {
  t('A');
  next();
  t('a');
});

app.use('/shop', (req, res, next) => {
  t(`B(${req.url})`);
  next();
});

app.get('/shop/items', async (req, res, next) => {
  t('C');
  await new Promise((r) => setTimeout(r, 20));
  t('c');
  next();
});

app.get('/shop/items', (req, res) => {
  t('D');
  res.send('items');
});

app.use((req, res, next) => {
  t('E');
  next();
});

app.get('/early', (req, res, next) => {
  t('F');
  res.send('early');
  next();
});

app.get('/boom', (req, res) => {
  t('G');
  throw new Error('boom');
});

app.use((req, res, next) => {
  t('H');
  if (res.headersSent) return;
  res.status(404).send('404');
});

app.use((err, req, res, next) => {
  t(`I(${err.message})`);
  res.status(500).send('500');
});

const requests = ['/shop/items', '/early', '/boom', '/nothing', '/SHOP/items/', '/shop'];

const server = app.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const [i, path] of requests.entries()) {
    trace = [];
    const res = await fetch(base + path, { signal: AbortSignal.timeout(2000) });
    const text = await res.text();
    await new Promise((r) => setTimeout(r, 50)); // 応答の後に動くものも待つ
    console.log(`${i + 1}. GET ${path.padEnd(14)} → ${res.status} ${JSON.stringify(text).padEnd(9)} 記録: ${trace.join(' ')}`);
  }
  server.close();
});
