// 5・6節: 登録とログインの API（ユーザーはメモリに置く。セッションは第52章で足す）
// 動かし方: node samples/auth-api.ts   → http://127.0.0.1:9617
import express, { type ErrorRequestHandler } from 'express';
import { z } from 'zod';
import { createLoginLimiter } from './limiter.ts';
import { hashPassword, verifyPassword } from './password.ts';
import { checkPassword } from './policy.ts';

type User = { id: number; email: string; passwordHash: string };

const Credentials = z.object({
  // メールアドレスは、前後の空白を除いて小文字にそろえる（Alice@Example.com と alice@example.com を同じ人にする）
  email: z.string().trim().toLowerCase().pipe(z.email()),
  // 長すぎるパスワードは、ハッシュの計算に時間がかかるので、確かめる前に断る
  password: z.string().min(1).max(256),
});

/** ユーザーがいないときにも、同じ重さの計算をするためのハッシュ（中身は何でもよい） */
const DUMMY_HASH = await hashPassword('dev-only-dummy-password');

export function createAuthApp() {
  const users = new Map<string, User>(); // メールアドレス → ユーザー
  let nextId = 1;
  const limiter = createLoginLimiter({ max: 5, windowMs: 15 * 60_000 });

  const app = express();
  app.use(express.json());

  app.post('/api/register', async (req, res) => {
    const parsed = Credentials.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ detail: 'email と password を送ってください' });
    const { email, password } = parsed.data;
    const errors = checkPassword(password, email);
    if (errors.length > 0) return res.status(422).json({ detail: 'パスワードが決まりに合いません', errors });
    // このままでは、だれでも「このアドレスは登録済みか」を調べられる。第53章で、メールで確かめる形に直す
    if (users.has(email)) return res.status(409).json({ detail: 'このメールアドレスは登録できません' });
    const user = { id: nextId++, email, passwordHash: await hashPassword(password) };
    users.set(email, user);
    res.status(201).json({ id: user.id, email: user.email });
  });

  app.post('/api/login', async (req, res) => {
    const parsed = Credentials.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ detail: 'email と password を送ってください' });
    const { email, password } = parsed.data;

    const limit = limiter.check(email);
    if (!limit.ok) {
      res.set('Retry-After', String(limit.retryAfter));
      return res.status(429).json({ detail: 'ログインの失敗が多すぎます。しばらくしてから、もう一度やってください' });
    }

    const user = users.get(email);
    // ユーザーがいなくても、ダミーのハッシュで同じ計算をする（応答の時間で「いるかどうか」が分からないように）
    const ok = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password);
    if (user === undefined || !ok) {
      limiter.fail(email);
      // メールアドレスとパスワードの、どちらが違ったのかは言わない
      return res.status(401).json({ detail: 'メールアドレスかパスワードが違います' });
    }
    limiter.reset(email);
    res.json({ id: user.id, email: user.email });
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ detail: 'サーバの中で失敗しました' });
  };
  app.use(onError);
  return app;
}

if (import.meta.main) {
  createAuthApp().listen(9617, '127.0.0.1', () => console.log('http://127.0.0.1:9617'));
}
