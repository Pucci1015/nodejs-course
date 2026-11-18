// 第53章 練習問題8 の模範解答: パスワードを忘れたときの再設定（本文6節）
// 前半（登録・確認・ログイン）は本文5節の email-app.ts と同じ
import express from 'express';
import { z } from 'zod';
import type { Mail, Mailer } from '../exercises/mailer.ts';
import { buildAlreadyRegisteredMail, buildVerifyMail, escapeHtml } from '../exercises/mails.ts';
import { hashPassword, verifyPassword } from '../exercises/password.ts';
import { createTokenStore } from '../exercises/token.ts';

type User = { id: number; email: string; passwordHash: string; emailVerifiedAt: number | null };

const Register = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(12).max(128),
});
const Login = z.object({ email: z.string().trim().toLowerCase(), password: z.string().min(1).max(256) });
// 追加: 再設定のための入力
const Forgot = z.object({ email: z.string().trim().toLowerCase().max(254) });
const Reset = z.object({ token: z.string().min(1).max(200), newPassword: z.string().min(12).max(128) });

const DAY = 24 * 60 * 60 * 1000;
const RESET_TTL_MIN = 30; // 追加
const RESEND_INTERVAL = 60 * 1000; // 追加: 同じアドレスへの再設定のメールは、1分に1通まで
const DUMMY_HASH = await hashPassword('dev-only-dummy-password');

function page(title: string, body: string): string {
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><title>${escapeHtml(title)}</title><h1>${escapeHtml(title)}</h1>${body}</html>`;
}

export function createResetApp({ mailer, baseUrl = 'http://127.0.0.1:9637', now = Date.now }: { mailer: Mailer; baseUrl?: string; now?: () => number }) {
  const users = new Map<string, User>();
  let nextId = 1;
  const tokens = createTokenStore({ now });
  /** 追加: メールアドレス → 最後に再設定のメールを送った時刻 */
  const lastResetMail = new Map<string, number>();

  function deliver(mail: Mail) {
    mailer.send(mail).catch((err: unknown) => console.error('メールを送れませんでした', mail.to, err));
  }

  function sendVerifyMail(user: User) {
    const token = tokens.issue(user.id, 'verify', DAY);
    deliver(buildVerifyMail(user.email, `${baseUrl}/verify?token=${token}`));
  }

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.post('/api/register', async (req, res) => {
    const parsed = Register.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ detail: 'email と password（12〜128文字）を送ってください' });
    const { email, password } = parsed.data;
    const passwordHash = await hashPassword(password);
    const existing = users.get(email);
    if (existing === undefined) {
      const user: User = { id: nextId++, email, passwordHash, emailVerifiedAt: null };
      users.set(email, user);
      sendVerifyMail(user);
    } else if (existing.emailVerifiedAt === null) {
      existing.passwordHash = passwordHash;
      sendVerifyMail(existing);
    } else {
      deliver(buildAlreadyRegisteredMail(email, `${baseUrl}/login`));
    }
    res.status(202).json({ detail: '確認のメールを送りました。メールのリンクを開いてください' });
  });

  app.get('/verify', (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    res.type('html').send(
      page(
        'メールアドレスの確認',
        `<form method="post" action="/verify"><input type="hidden" name="token" value="${escapeHtml(token)}"><button>確認する</button></form>`,
      ),
    );
  });

  app.post('/verify', (req, res) => {
    const body: unknown = req.body;
    const token = typeof body === 'object' && body !== null && 'token' in body && typeof body.token === 'string' ? body.token : '';
    const userId = tokens.consume(token, 'verify');
    const user = [...users.values()].find((u) => u.id === userId);
    if (user === undefined) {
      return res.status(400).type('html').send(page('確認できませんでした', '<p>リンクが正しくないか、期限が切れています。もう一度登録してください。</p>'));
    }
    user.emailVerifiedAt = now();
    res.type('html').send(page('確認できました', '<p>ログインしてください。</p>'));
  });

  app.post('/api/login', async (req, res) => {
    const parsed = Login.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ detail: 'email と password を送ってください' });
    const user = users.get(parsed.data.email);
    const ok = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, parsed.data.password);
    if (user === undefined || !ok) return res.status(401).json({ detail: 'メールアドレスかパスワードが違います' });
    if (user.emailVerifiedAt === null) return res.status(403).json({ detail: 'メールアドレスを確認してください' });
    res.json({ id: user.id, email: user.email });
  });

  // 追加: パスワードを忘れた
  app.post('/api/password/forgot', (req, res) => {
    const parsed = Forgot.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ detail: 'email を送ってください' });
    const { email } = parsed.data;
    const user = users.get(email);
    const last = lastResetMail.get(email);
    // いない人には送らない。同じアドレスへは、1分に1通まで（メールで相手を困らせる使い方を防ぐ）
    if (user !== undefined && (last === undefined || now() - last >= RESEND_INTERVAL)) {
      lastResetMail.set(email, now());
      const token = tokens.issue(user.id, 'reset', RESET_TTL_MIN * 60 * 1000);
      const link = `${baseUrl}/reset?token=${token}`;
      deliver({
        to: email,
        subject: 'パスワードの再設定',
        text: `次のリンクを開いて、新しいパスワードを決めてください（${RESET_TTL_MIN}分有効）。\n\n${link}\n\n心当たりが無ければ、何もしなくてかまいません。`,
      });
    }
    // いてもいなくても、送っても送らなくても、同じ応答
    res.status(202).json({ detail: '登録されていれば、再設定のメールを送りました' });
  });

  // 追加: 新しいパスワードを決める
  app.post('/api/password/reset', async (req, res) => {
    const parsed = Reset.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ detail: 'token と newPassword（12〜128文字）を送ってください' });
    // ハッシュを先に計算してから、トークンを使う（計算の途中で、もう1つの同じリクエストに先を越されないように、
    // consume は await の後に、間を空けずに呼ぶ）
    const passwordHash = await hashPassword(parsed.data.newPassword);
    const userId = tokens.consume(parsed.data.token, 'reset');
    const user = [...users.values()].find((u) => u.id === userId);
    if (user === undefined) return res.status(400).json({ detail: 'リンクが正しくないか、期限が切れています' });
    user.passwordHash = passwordHash;
    // メールのリンクを開けた = そのアドレスを持っている。確認がまだなら、確認できたことにする
    user.emailVerifiedAt ??= now();
    res.status(204).end();
  });

  return app;
}
