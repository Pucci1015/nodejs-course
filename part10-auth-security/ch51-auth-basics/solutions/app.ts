// 第51章 練習問題8 の模範解答: 登録・ログイン・パスワードの変更の API
import express, { type ErrorRequestHandler } from 'express';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../exercises/password.ts';
import { checkPassword } from '../exercises/policy-sample.ts';

type User = { id: number; email: string; passwordHash: string };

const Email = z.string().trim().toLowerCase().pipe(z.email());
const Password = z.string().min(1).max(256);
const Credentials = z.object({ email: Email, password: Password });
const ChangePassword = z.object({ email: Email, currentPassword: Password, newPassword: Password });

const DUMMY_HASH = await hashPassword('dev-only-dummy-password');
const WRONG = 'メールアドレスかパスワードが違います';

export function createAuthApp() {
  const users = new Map<string, User>();
  let nextId = 1;
  /** メールアドレスとパスワードが合えばユーザーを、合わなければ undefined を返す（いないときもダミーで計算する） */
  async function authenticate(email: string, password: string): Promise<User | undefined> {
    const user = users.get(email);
    const ok = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password);
    return user !== undefined && ok ? user : undefined;
  }

  const app = express();
  app.use(express.json());

  app.post('/api/register', async (req, res) => {
    const parsed = Credentials.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ detail: '送った値が正しくありません' });
    const { email, password } = parsed.data;
    const errors = checkPassword(password, email);
    if (errors.length > 0) return res.status(422).json({ detail: 'パスワードが決まりに合いません', errors });
    if (users.has(email)) return res.status(409).json({ detail: 'このメールアドレスは登録できません' });
    const user = { id: nextId++, email, passwordHash: await hashPassword(password) };
    users.set(email, user);
    res.status(201).json({ id: user.id, email });
  });

  app.post('/api/login', async (req, res) => {
    const parsed = Credentials.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ detail: '送った値が正しくありません' });
    const user = await authenticate(parsed.data.email, parsed.data.password);
    if (user === undefined) return res.status(401).json({ detail: WRONG });
    res.json({ id: user.id, email: user.email });
  });

  app.post('/api/password', async (req, res) => {
    const parsed = ChangePassword.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ detail: '送った値が正しくありません' });
    const { email, currentPassword, newPassword } = parsed.data;
    const user = await authenticate(email, currentPassword);
    if (user === undefined) return res.status(401).json({ detail: WRONG });
    const errors = checkPassword(newPassword, email);
    if (newPassword === currentPassword) errors.push('今と同じパスワードです');
    if (errors.length > 0) return res.status(422).json({ detail: 'パスワードが決まりに合いません', errors });
    user.passwordHash = await hashPassword(newPassword);
    res.status(204).end();
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ detail: 'サーバの中で失敗しました' });
  };
  app.use(onError);
  return app;
}
