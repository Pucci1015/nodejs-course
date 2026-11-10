// express-session と、第22章の withSession（第24章 6.3節）
//   $ SESSION_SECRET=$(node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))") node session-demo.mjs
//   別のターミナルで（-c と -b で Cookie を保存して送り返す）:
//     curl -si -c /tmp/ch24.jar http://127.0.0.1:9314/me                   ← Set-Cookie は付かない（空のセッションは作らない）
//     curl -si -c /tmp/ch24.jar -b /tmp/ch24.jar -d 'name=alice' http://127.0.0.1:9314/login | grep -i set-cookie
//     curl -s  -b /tmp/ch24.jar http://127.0.0.1:9314/me
//     curl -si -c /tmp/ch24.jar -b /tmp/ch24.jar -X POST http://127.0.0.1:9314/logout | grep -i set-cookie
//   （パスワードの確かめは省いた。本物のログインは第22章と第10部）
import express from 'express';
import session from 'express-session';

const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) {
  console.error('SESSION_SECRET を 32 文字以上で指定してください（先頭のコメントの例を参照）');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.use(
  session({
    name: 'sid', // 既定の connect.sid は「Express だ」と知らせるだけなので変える
    secret, // Cookie の ID に付ける署名の鍵（第22章 5節の sign と同じ考え方）。配列にすると鍵を取り替えられる
    resave: false, // 変わっていないセッションを、リクエストのたびに保存し直さない
    saveUninitialized: false, // 何も入れていないセッションは保存せず、Cookie も送らない（第22章の withSession と同じ）
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // HTTPS で公開するときは true（第12部）。ここは http://127.0.0.1 なので false
      maxAge: 30 * 60 * 1000,
    },
    // store を書かないと、メモリに保存する MemoryStore になる。プロセスを止めると消え、
    // サーバが複数台だと共有できない。本番では Redis などに置く（第6部 第34章）
  }),
);

app.get('/me', (req, res) => {
  res.json({ user: req.session.user ?? null });
});

app.post('/login', express.urlencoded({ extended: false }), (req, res, next) => {
  const name = String(req.body?.name ?? '').trim();
  if (!name) return res.status(422).json({ error: 'name を入れてください' });
  // ログインしたら ID を作り直す（セッション固定化の対策。第22章 7節の regenerate と同じ）
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.user = { name };
    res.json({ ok: true });
  });
});

app.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('sid', { httpOnly: true, sameSite: 'lax' });
    res.json({ ok: true });
  });
});

app.listen(9314, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9314/ で待っています（Ctrl+C で止める）');
});
