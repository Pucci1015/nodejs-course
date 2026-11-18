// 5節: 登録 → 確認のメール → リンクを開いて確認 → ログイン
// 動かし方: node samples/email-app.ts   → http://127.0.0.1:9637（先に、別のターミナルで npm run mail か Mailpit）
import express from 'express';
import { z } from 'zod';
import { createSmtpMailer, type Mail, type Mailer } from './mailer.ts';
import { buildAlreadyRegisteredMail, buildVerifyMail, escapeHtml } from './mails.ts';
import { hashPassword, verifyPassword } from './password.ts';
import { createTokenStore } from './token.ts';

type User = { id: number; email: string; passwordHash: string; emailVerifiedAt: number | null };

const Register = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(12).max(128),
});
const Login = z.object({ email: z.string().trim().toLowerCase(), password: z.string().min(1).max(256) });

const DAY = 24 * 60 * 60 * 1000;
const DUMMY_HASH = await hashPassword('dev-only-dummy-password');

/** 小さな HTML のページ（第4部 第21章） */
function page(title: string, body: string): string {
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><title>${escapeHtml(title)}</title><h1>${escapeHtml(title)}</h1>${body}</html>`;
}

export function createEmailApp({ mailer, baseUrl = 'http://127.0.0.1:9637', now = Date.now }: { mailer: Mailer; baseUrl?: string; now?: () => number }) {
  const users = new Map<string, User>();
  let nextId = 1;
  const tokens = createTokenStore({ now });

  /** メールを送る。応答は待たせない（7節）。失敗はログに残す */
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
    // 登録済みでも、まだでも、同じ時間をかける（ハッシュの計算は、どちらでもする）
    const passwordHash = await hashPassword(password);
    const existing = users.get(email);
    if (existing === undefined) {
      const user: User = { id: nextId++, email, passwordHash, emailVerifiedAt: null };
      users.set(email, user);
      sendVerifyMail(user);
    } else if (existing.emailVerifiedAt === null) {
      // 確認がまだなら、新しいパスワードにして、確認のメールを送り直す
      existing.passwordHash = passwordHash;
      sendVerifyMail(existing);
    } else {
      deliver(buildAlreadyRegisteredMail(email, `${baseUrl}/login`));
    }
    // どの場合も、同じ応答（だれが登録しているかを、応答から分からないようにする）
    res.status(202).json({ detail: '確認のメールを送りました。メールのリンクを開いてください' });
  });

  // メールのリンクで開くページ。GET では確認しない（ボタンを押すと POST する）
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
    // パスワードが合った人にだけ、確認がまだであることを教える
    if (user.emailVerifiedAt === null) return res.status(403).json({ detail: 'メールアドレスを確認してください' });
    res.json({ id: user.id, email: user.email });
  });

  return app;
}

if (import.meta.main) {
  const app = createEmailApp({ mailer: createSmtpMailer() });
  app.listen(9637, '127.0.0.1', () => console.log('http://127.0.0.1:9637'));
}
