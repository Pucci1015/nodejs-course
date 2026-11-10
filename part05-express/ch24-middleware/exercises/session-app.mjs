// 練習問題8: express-session の設定と使い方のバグを直す
// 買い物かごとログインのある小さなアプリです。第22章で自分で作ったセッションと同じことを、express-session で正しくしてください。
//   $ bash check-session.sh                  （このファイルを 127.0.0.1:9318 で起動して確かめる）
//   $ SESSION_SECRET=…（32文字以上） PORT=9318 node session-app.mjs
// 仕様は exercises/README.md の問題8です。
import express from 'express';
import session from 'express-session';

const PASSWORD = 'dev-only-password'; // 練習用の決まった値。本物のパスワードの確かめは第22章と第10部

const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use(
  session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { httpOnly: true },
  }),
);

app.get('/me', (req, res) => {
  res.json({ user: req.session.user ?? null, cart: req.session.cart ?? [] });
});

// 買い物かごに入れる（ログインしていなくてもよい）
app.post('/cart', (req, res) => {
  const item = req.body?.item;
  if (typeof item !== 'string' || item === '') return res.status(422).json({ error: 'item が必要です' });
  req.session.cart = [...(req.session.cart ?? []), item];
  res.json({ cart: req.session.cart });
});

app.post('/login', (req, res) => {
  const { name, password } = req.body ?? {};
  if (typeof name !== 'string' || name === '' || password !== PASSWORD) {
    return res.status(401).json({ error: '名前かパスワードが違います' });
  }
  req.session.user = { name };
  res.json({ ok: true });
});

app.post('/logout', (req, res) => {
  delete req.session.user;
  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 9318);
app.listen(port, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${port}/ で待っています`);
});
