// 第52章 練習問題8 の模範解答: ほかの端末のセッションも消す（本文8節）
import express from 'express';
import session from 'express-session';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../exercises/password.ts';

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

type User = { id: number; email: string; passwordHash: string };

const Login = z.object({ email: z.string().trim().toLowerCase(), password: z.string().min(1).max(256) });
const ChangePassword = z.object({ currentPassword: z.string().min(1).max(256), newPassword: z.string().min(12).max(128) });

export async function createApp() {
  const users = new Map<number, User>([
    [1, { id: 1, email: 'alice@example.com', passwordHash: await hashPassword('neko-to-inu-to-tori') }],
    [2, { id: 2, email: 'bob@example.com', passwordHash: await hashPassword('inu-to-saru-to-kiji') }],
  ]);
  const store = new session.MemoryStore();
  /** ユーザーの id → そのユーザーのセッションの ID の集まり */
  const sessionsOf = new Map<number, Set<string>>();

  function remember(userId: number, sid: string) {
    const set = sessionsOf.get(userId) ?? new Set<string>();
    set.add(sid);
    sessionsOf.set(userId, set);
  }

  /** store.destroy はコールバックの形なので、Promise にして待てるようにする */
  function destroySid(sid: string) {
    return new Promise<void>((resolve, reject) => {
      store.destroy(sid, (err: unknown) => {
        if (err) reject(err instanceof Error ? err : new Error('セッションを消せませんでした'));
        else resolve();
      });
    });
  }

  /** そのユーザーのセッションを、keep 以外すべて消す */
  async function destroyAllOf(userId: number, keep?: string) {
    const set = sessionsOf.get(userId) ?? new Set<string>();
    for (const sid of set) {
      if (sid === keep) continue;
      await destroySid(sid);
      set.delete(sid);
    }
  }

  const app = express();
  app.use(express.json());
  app.use(
    session({
      name: 'sid',
      secret: 'dev-only-session-secret-change-me',
      store,
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax' },
    }),
  );

  const currentUser = (req: express.Request) => (req.session.userId === undefined ? undefined : users.get(req.session.userId));

  app.post('/api/login', async (req, res) => {
    const parsed = Login.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ detail: 'email と password を送ってください' });
    const user = [...users.values()].find((u) => u.email === parsed.data.email);
    const ok = user !== undefined && (await verifyPassword(user.passwordHash, parsed.data.password));
    if (user === undefined || !ok) return res.status(401).json({ detail: 'メールアドレスかパスワードが違います' });
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ detail: 'ログインできませんでした' });
      req.session.userId = user.id;
      // regenerate の後の新しい ID を覚える
      remember(user.id, req.sessionID);
      res.json({ id: user.id, email: user.email });
    });
  });

  app.get('/api/me', (req, res) => {
    const user = currentUser(req);
    if (user === undefined) return res.status(401).json({ detail: 'ログインしてください' });
    res.json({ id: user.id, email: user.email });
  });

  app.post('/api/logout', (req, res) => {
    const userId = req.session.userId;
    if (userId !== undefined) sessionsOf.get(userId)?.delete(req.sessionID);
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ detail: 'ログアウトできませんでした' });
      res.clearCookie('sid');
      res.status(204).end();
    });
  });

  app.post('/api/logout-all', async (req, res) => {
    const user = currentUser(req);
    if (user === undefined) return res.status(401).json({ detail: 'ログインしてください' });
    // 自分のセッションも含めて消す。req.session はメモリの中に残っているので、保存させないように destroy も呼ぶ
    await destroyAllOf(user.id);
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ detail: 'ログアウトできませんでした' });
      res.clearCookie('sid');
      res.status(204).end();
    });
  });

  app.post('/api/password', async (req, res) => {
    const user = currentUser(req);
    if (user === undefined) return res.status(401).json({ detail: 'ログインしてください' });
    const parsed = ChangePassword.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ detail: 'currentPassword と newPassword（12文字以上）を送ってください' });
    if (!(await verifyPassword(user.passwordHash, parsed.data.currentPassword))) {
      return res.status(401).json({ detail: '今のパスワードが違います' });
    }
    user.passwordHash = await hashPassword(parsed.data.newPassword);
    // パスワードを変えたら、ほかの端末のセッションは消す（盗まれていたかもしれないので）。今の端末は残す
    await destroyAllOf(user.id, req.sessionID);
    res.status(204).end();
  });

  return app;
}
