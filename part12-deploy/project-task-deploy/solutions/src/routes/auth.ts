// 追加（第10部）: /api/auth のルート。登録・メールの確認・ログイン・ログアウト・パスワードの再設定・練習用の IdP でログイン
// 決まりはサービス（services/auth.ts）。ここは HTTP を読み、セッションを作り直し、応答の形にする
import express, { type Request, type RequestHandler } from 'express';
import { z } from 'zod';
import type { OidcClient } from '../auth/oidc.ts';
import type { PgSessionStore } from '../auth/pg-session-store.ts';
import { HttpProblem } from '../middleware/problem.ts';
import type { UserRepo } from '../repositories/pg-users.ts';
import type { AuthService } from '../services/auth.ts';

const Email = z.string().trim().max(254).pipe(z.email());
const Password = z.string().min(1).max(256);
const Credentials = z.strictObject({ email: Email, password: Password });
const EmailOnly = z.strictObject({ email: Email });
const TokenOnly = z.strictObject({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) });
const Reset = z.strictObject({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), password: Password });

/** 登録・再設定は、登録済みかどうかに関係なく、同じ応答（第53章 5.3節） */
const SENT = { detail: 'メールを送りました。届いたメールのリンクを開いてください' };

export type AuthRouterDeps = {
  auth: AuthService;
  users: UserRepo;
  store: PgSessionStore;
  /** 練習用の IdP（設定が無ければ undefined。/idp/login は 404） */
  oidc?: OidcClient | undefined;
  oidcIssuer?: string | undefined;
  /** ログイン・登録などの回数の上限（第51章 6節）。無ければ数えない */
  limiter?: RequestHandler | undefined;
  /** セッションの Cookie の名前と Secure か（消すときに、付けたときと同じ属性で送る。__Host- の Cookie は Secure が無いと消せない） */
  sessionCookie: { name: string; secure: boolean };
};

/** セッションの ID を作り直してから、ログインした人を入れる（セッション固定化への備え。第52章 4節） */
function logIn(req: Request, userId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err instanceof Error ? err : new Error(String(err)));
      req.session.userId = userId;
      req.session.save((err2) => (err2 ? reject(err2 instanceof Error ? err2 : new Error(String(err2))) : resolve()));
    });
  });
}

function destroy(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(err instanceof Error ? err : new Error(String(err))) : resolve()));
  });
}

export function createAuthRouter({
  auth,
  users,
  store,
  oidc,
  oidcIssuer,
  limiter,
  sessionCookie,
}: AuthRouterDeps): express.Router {
  const router = express.Router();
  const limit: RequestHandler = limiter ?? ((_req, _res, next) => next());
  const clearCookie = (res: express.Response) =>
    res.clearCookie(sessionCookie.name, { path: '/', httpOnly: true, sameSite: 'lax', secure: sessionCookie.secure });

  router.post('/register', limit, async (req, res) => {
    const { email, password } = Credentials.parse(req.body);
    await auth.register(email, password);
    res.status(202).json(SENT);
  });

  router.post('/verify-email', limit, async (req, res) => {
    const { token } = TokenOnly.parse(req.body);
    if (!(await auth.verifyEmail(token)))
      throw new HttpProblem(400, {
        detail: 'リンクが正しくないか、期限が切れています。もう一度ログインして、確認のメールを送り直してください',
      });
    res.sendStatus(204);
  });

  router.post('/resend-verification', limit, async (req, res) => {
    const { email, password } = Credentials.parse(req.body);
    await auth.resendVerification(email, password);
    res.status(202).json(SENT);
  });

  router.post('/login', limit, async (req, res) => {
    const { email, password } = Credentials.parse(req.body);
    const r = await auth.login(email, password);
    if (r.kind === 'invalid') throw new HttpProblem(401, { detail: 'メールアドレスかパスワードが違います' });
    if (r.kind === 'unverified')
      throw new HttpProblem(403, {
        type: 'urn:task-api:email-not-verified',
        detail: 'メールアドレスの確認がまだです。届いたメールのリンクを開いてください',
      });
    await logIn(req, r.userId);
    res.sendStatus(204);
  });

  router.post('/logout', async (req, res) => {
    await destroy(req);
    clearCookie(res);
    res.sendStatus(204);
  });

  /** すべての端末からログアウト（第52章 8節） */
  router.post('/logout-all', async (req, res) => {
    const userId = req.session.userId;
    if (userId === undefined) throw new HttpProblem(401, { detail: 'ログインしてください' });
    await destroy(req); // 先に自分のセッションを消す（応答の後で express-session が書き戻さないように）
    await store.destroyAllForUser(userId);
    clearCookie(res);
    res.sendStatus(204);
  });

  router.get('/me', async (req, res) => {
    const userId = req.session.userId;
    const user = userId === undefined ? null : await users.findById(userId);
    if (user === null) throw new HttpProblem(401, { detail: 'ログインしてください' });
    res.set('Cache-Control', 'no-store').json({ id: user.id, email: user.email });
  });

  router.post('/forgot-password', limit, async (req, res) => {
    const { email } = EmailOnly.parse(req.body);
    await auth.requestPasswordReset(email);
    res.status(202).json(SENT);
  });

  router.post('/reset-password', limit, async (req, res) => {
    const { token, password } = Reset.parse(req.body);
    const userId = await auth.resetPassword(token, password);
    if (userId === null)
      throw new HttpProblem(400, {
        detail: 'リンクが正しくないか、期限が切れています。もう一度、再設定のメールを送ってください',
      });
    // パスワードを変えたら、ほかの端末のログインも終わらせる（盗まれていたかもしれないので）
    await store.destroyAllForUser(userId);
    res.sendStatus(204);
  });

  // 練習用の IdP でログイン（第54章 5節）。設定が無ければ、この2つの道は無い（404）
  router.get('/idp/login', async (req, res, next) => {
    if (oidc === undefined) return next();
    const { url, saved } = await oidc.start();
    req.session.oidc = saved;
    res.redirect(url);
  });

  router.get('/idp/callback', async (req, res, next) => {
    if (oidc === undefined || oidcIssuer === undefined) return next();
    const saved = req.session.oidc;
    delete req.session.oidc; // 1回だけ使う
    const { state, code, error } = req.query;
    if (saved === undefined || typeof state !== 'string' || state !== saved.state)
      return res.redirect(303, '/login?error=state');
    if (typeof error === 'string') return res.redirect(303, '/login?error=denied');
    if (typeof code !== 'string') return res.redirect(303, '/login?error=state');
    let profile;
    try {
      const claims = await oidc.finish(code, saved);
      profile = {
        issuer: oidcIssuer,
        subject: claims.sub,
        email: claims.email,
        emailVerified: claims.email_verified === true,
      };
    } catch (err) {
      req.log.warn({ err }, '練習用の IdP でのログインに失敗しました');
      return res.redirect(303, '/login?error=idp');
    }
    const r = await auth.signInWithExternal(profile);
    if (r.kind === 'conflict') return res.redirect(303, '/login?error=conflict');
    await logIn(req, r.userId);
    res.redirect(303, '/');
  });

  return router;
}
