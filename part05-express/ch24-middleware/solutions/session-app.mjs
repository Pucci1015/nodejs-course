// 練習問題8の模範解答: express-session を、第22章の withSession と同じ考え方で使う
//   $ bash ../exercises/check-session.sh ../solutions/session-app.mjs
import express from 'express';
import session from 'express-session';

const PASSWORD = 'dev-only-password'; // 練習用の決まった値。本物のパスワードの確かめは第22章と第10部

// 修正: 鍵はソースに書かず、環境変数から読む。短い鍵は総当たりで見つけられるので、起動の時点で断る（第22章 5節）
const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) {
  console.error('SESSION_SECRET を 32 文字以上で指定してください');
  process.exit(1);
}

const COOKIE = { httpOnly: true, sameSite: 'lax', secure: false, path: '/' }; // HTTPS で公開するなら secure: true（第12部）

const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use(
  session({
    name: 'sid', // 修正: 既定の connect.sid は「Express だ」と知らせるだけ
    secret,
    resave: false,
    saveUninitialized: false, // 修正: 何も入れていない客のセッションは作らない（見るだけの客に Cookie を送らない）
    cookie: { ...COOKIE, maxAge: 30 * 60 * 1000 }, // 修正: SameSite=Lax（第22章 2節、CSRF の対策の1つ）
  }),
);

// 追加: コールバックの API を Promise にする（第3部 第12章）
const regenerate = (req) => new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
const destroy = (req) => new Promise((resolve, reject) => req.session.destroy((err) => (err ? reject(err) : resolve())));

app.get('/me', (req, res) => {
  res.json({ user: req.session.user ?? null, cart: req.session.cart ?? [] });
});

app.post('/cart', (req, res) => {
  const item = req.body?.item;
  if (typeof item !== 'string' || item === '') return res.status(422).json({ error: 'item が必要です' });
  req.session.cart = [...(req.session.cart ?? []), item];
  res.json({ cart: req.session.cart });
});

app.post('/login', async (req, res) => {
  const { name, password } = req.body ?? {};
  if (typeof name !== 'string' || name === '' || password !== PASSWORD) {
    return res.status(401).json({ error: '名前かパスワードが違います' });
  }
  // 修正: ログインしたら、セッションの ID を作り直す（セッション固定化の対策。第22章 7節）
  //       regenerate は中身も空にするので、残したいもの（かご）は先に取っておいて入れ直す
  const cart = req.session.cart ?? [];
  await regenerate(req);
  req.session.cart = cart;
  req.session.user = { name };
  res.json({ ok: true });
});

app.post('/logout', async (req, res) => {
  // 修正: user を消すだけでは、セッションそのもの（かごなど）が保存場所に残る。
  //       destroy で保存場所から消し、Cookie も消す（同じ属性で、過去の期限にする）
  await destroy(req);
  res.clearCookie('sid', COOKIE);
  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 9318);
app.listen(port, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${port}/ で待っています`);
});
