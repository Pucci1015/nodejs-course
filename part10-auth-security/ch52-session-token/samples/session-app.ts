// 2〜4節: express-session でログインした状態を覚える
// 動かし方: node samples/session-app.ts   → http://127.0.0.1:9627
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import session from 'express-session';
import { z } from 'zod';
import { hashPassword, verifyPassword } from './password.ts';

// req.session に入れる値の型を、express-session の型に足す（宣言のマージ。第7部 第37章 5.2節）
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

type User = { id: number; email: string; passwordHash: string };

const Credentials = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(256),
});

const DUMMY_HASH = await hashPassword('dev-only-dummy-password');

/** ログインしていなければ 401 で止める */
export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.session.userId === undefined) {
    res.status(401).json({ detail: 'ログインしてください' });
    return;
  }
  next();
};

export async function createSessionApp() {
  // 試しやすいように、alice を最初から登録しておく（パスワードは neko-to-inu-to-tori）
  const users = new Map<string, User>([
    ['alice@example.com', { id: 1, email: 'alice@example.com', passwordHash: await hashPassword('neko-to-inu-to-tori') }],
  ]);

  const app = express();
  app.use(express.json());
  app.use(
    session({
      name: 'sid', // Cookie の名前（既定の connect.sid は、Express を使っていることが分かるので変える）
      secret: process.env.SESSION_SECRET ?? 'dev-only-session-secret-change-me', // Cookie の署名の鍵
      resave: false, // 中身が変わっていなければ、保存し直さない
      saveUninitialized: false, // 何も入れていないセッションは作らない（ログインするまで Cookie を出さない）
      cookie: {
        httpOnly: true, // JavaScript（document.cookie）から読めない
        sameSite: 'lax', // ほかのサイトからの POST などには付けない
        secure: process.env.NODE_ENV === 'production', // 本番では HTTPS のときだけ送る
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7日（ミリ秒）
      },
    }),
  );

  app.post('/api/login', async (req, res) => {
    const parsed = Credentials.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ detail: 'email と password を送ってください' });
    const user = users.get(parsed.data.email);
    const ok = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, parsed.data.password);
    if (user === undefined || !ok) return res.status(401).json({ detail: 'メールアドレスかパスワードが違います' });

    // ログインの前に、セッションの ID を作り直す（セッション固定攻撃を防ぐ。3節）
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ detail: 'ログインできませんでした' });
      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email });
    });
  });

  app.get('/api/me', requireAuth, (req, res) => {
    const user = [...users.values()].find((u) => u.id === req.session.userId);
    res.json({ id: user?.id, email: user?.email });
  });

  app.post('/api/logout', (req, res) => {
    // サーバのセッションを消し、ブラウザの Cookie も消してもらう
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ detail: 'ログアウトできませんでした' });
      res.clearCookie('sid');
      res.status(204).end();
    });
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ detail: 'サーバの中で失敗しました' });
  };
  app.use(onError);
  return app;
}

if (import.meta.main) {
  const app = await createSessionApp();
  app.listen(9627, '127.0.0.1', () => console.log('http://127.0.0.1:9627'));
}
