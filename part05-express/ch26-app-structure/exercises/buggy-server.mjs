// 練習問題9: 設定・ログ・止め方のバグを直す（7か所）
// 仕様は exercises/README.md の問題9です。確かめ方:
//   $ bash check-server.sh
// ふだん curl で試すぶんには、何の問題もなく動きます。
import express from 'express';

const PORT = Number(process.env.PORT) || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'secret';

const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url, res.statusCode, JSON.stringify(req.headers));
  next();
});

app.get('/healthz', (req, res) => res.json({ status: 'ok' }));
app.get('/readyz', (req, res) => res.json({ status: 'ready' }));
app.get('/api/me', (req, res) => res.json({ loggedIn: req.get('authorization') !== undefined, secretLength: SESSION_SECRET.length }));
app.get('/slow', async (req, res) => {
  await new Promise((r) => setTimeout(r, 1500)); // 時間のかかる処理のつもり
  res.json({ done: true });
});
app.get('/hang', () => {}); // いつまでも返らない（バグのある処理のつもり）

app.listen(PORT, '127.0.0.1', () => {
  console.log(`listening on ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('bye');
  process.exit(0);
});
