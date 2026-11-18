// 追加（第10部）: ユーザー登録・メールの確認・ログイン・パスワードの再設定・外のログインの決まり
// 第51章（パスワード）、第53章（メール・トークン・列挙への備え）、第54章 練習問題7（結びつける判断）をまとめた
// HTTP も Express も知らない。メールは deliver（送るのを待たない関数）に渡すだけ
import type { Mail } from '../auth/mailer.ts';
import { buildAlreadyRegisteredMail, buildResetMail, buildVerifyMail } from '../auth/mails.ts';
import { dummyHash, hashPassword, verifyPassword } from '../auth/password.ts';
import { checkPassword } from '../auth/policy.ts';
import { hashToken, newToken } from '../auth/tokens.ts';
import { ValidationError } from '../errors.ts';
import type { UserRepo } from '../repositories/pg-users.ts';

export const VERIFY_HOURS = 24;
export const RESET_MINUTES = 30;

export type AuthServiceDeps = {
  users: UserRepo;
  /** メールのリンクの頭（画面のオリジン。例: http://localhost:5173） */
  appUrl: string;
  /** メールを送る。待たない（失敗はログに書く）。応答の時間で、登録済みかが分からないように */
  deliver: (mail: Mail) => void;
  clock?: () => Date;
};

export type LoginResult = { kind: 'ok'; userId: number } | { kind: 'invalid' } | { kind: 'unverified' };
export type ExternalProfile = { issuer: string; subject: string; email: string | undefined; emailVerified: boolean };
export type ExternalSignIn = { kind: 'ok'; userId: number } | { kind: 'conflict' };

/** メールアドレスをそろえる（前後の空白を取り、小文字に） */
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function createAuthService({ users, appUrl, deliver, clock = () => new Date() }: AuthServiceDeps) {
  const link = (path: string, token?: string) => `${appUrl}${path}${token === undefined ? '' : `#token=${token}`}`;
  const after = (ms: number) => new Date(clock().getTime() + ms);

  function checkPolicy(password: string, email: string): void {
    const errors = checkPassword(password, email);
    if (errors.length > 0) throw new ValidationError(errors.join('。'), 'password');
  }

  async function sendVerifyMail(userId: number, email: string): Promise<void> {
    const token = newToken();
    await users.issueToken(userId, 'verify', hashToken(token), after(VERIFY_HOURS * 60 * 60 * 1000));
    deliver(buildVerifyMail(email, link('/verify-email', token), VERIFY_HOURS));
  }

  return {
    /**
     * 登録する。登録済みのアドレスでも、同じように終わる（何も返さない）。本当のことは、メールで本人にだけ伝える（第53章 5.3節）
     * パスワードの決まりに合わなければ ValidationError（これは、登録済みかどうかに関係なく、同じ答え）
     */
    async register(rawEmail: string, password: string): Promise<void> {
      const email = normalizeEmail(rawEmail);
      checkPolicy(password, email);
      // どの道でもハッシュを計算して、かかる時間をそろえる
      const hash = await hashPassword(password);
      const existing = await users.findByEmail(email);
      if (existing !== null) {
        deliver(buildAlreadyRegisteredMail(email, link('/login'), link('/forgot-password')));
        return;
      }
      const user = await users.insertWithPassword(email, hash);
      if (user === null) return; // 同時に同じアドレスが登録された。先のほうに確認のメールが行く
      await sendVerifyMail(user.id, email);
    },

    /** 確認のリンクのトークンを使う。使えたら true */
    async verifyEmail(token: string): Promise<boolean> {
      const userId = await users.consumeToken(hashToken(token), 'verify');
      if (userId === null) return false;
      await users.markVerified(userId);
      return true;
    },

    /** パスワードでログイン。「確認がまだ」は、パスワードが合ったときだけ教える（第53章 5.2節） */
    async login(rawEmail: string, password: string): Promise<LoginResult> {
      const user = await users.findByEmail(normalizeEmail(rawEmail));
      const ok = await verifyPassword(user?.passwordHash ?? (await dummyHash()), password);
      if (user === null || user.passwordHash === null || !ok) return { kind: 'invalid' };
      if (!user.emailVerified) return { kind: 'unverified' };
      return { kind: 'ok', userId: user.id };
    },

    /** 確認のメールを送り直す。パスワードが合ったときだけ（ログインの画面の「確認がまだ」から） */
    async resendVerification(rawEmail: string, password: string): Promise<void> {
      const email = normalizeEmail(rawEmail);
      const user = await users.findByEmail(email);
      const ok = await verifyPassword(user?.passwordHash ?? (await dummyHash()), password);
      if (user === null || !ok || user.emailVerified) return;
      await sendVerifyMail(user.id, email);
    },

    /** パスワードの再設定のメールを送る。アドレスが無くても、同じように終わる（第53章 6節） */
    async requestPasswordReset(rawEmail: string): Promise<void> {
      const email = normalizeEmail(rawEmail);
      const user = await users.findByEmail(email);
      if (user === null) return;
      const token = newToken();
      await users.issueToken(user.id, 'reset', hashToken(token), after(RESET_MINUTES * 60 * 1000));
      deliver(buildResetMail(email, link('/reset-password', token), RESET_MINUTES));
    },

    /**
     * 新しいパスワードにする。使えたらユーザーの id（呼んだ側が、その人のセッションを全部消す）、トークンが使えなければ null。
     * メールのリンクを開けたので、アドレスの確認も済んだことにする
     */
    async resetPassword(token: string, password: string): Promise<number | null> {
      const tokenHash = hashToken(token);
      const userId = await users.consumeToken(tokenHash, 'reset');
      if (userId === null) return null;
      const user = await users.findById(userId);
      if (user === null) return null;
      try {
        checkPolicy(password, user.email ?? '');
      } catch (err) {
        // 決まりに合わなかったときは、トークンを戻して、打ち直せるようにする
        await users.issueToken(userId, 'reset', tokenHash, after(RESET_MINUTES * 60 * 1000));
        throw err;
      }
      await users.setPassword(userId, await hashPassword(password));
      await users.markVerified(userId);
      return userId;
    },

    /**
     * 外のログイン（OpenID Connect）でログインする（第54章 6節・練習問題7）。
     * 1. 前に同じ issuer + sub でログインした → その人
     * 2. 同じアドレスのユーザーがいる → 両方で確認済みのときだけ結びつける。そうでなければ conflict
     * 3. それ以外 → 新しいユーザー（IdP が確かめたアドレスだけを入れる）
     */
    async signInWithExternal(profile: ExternalProfile): Promise<ExternalSignIn> {
      const known = await users.findIdByIdentity(profile.issuer, profile.subject);
      if (known !== null) return { kind: 'ok', userId: known };
      const email = profile.email === undefined ? undefined : normalizeEmail(profile.email);
      if (email !== undefined) {
        const same = await users.findByEmail(email);
        if (same !== null) {
          if (!profile.emailVerified || !same.emailVerified) return { kind: 'conflict' };
          await users.linkIdentity(profile.issuer, profile.subject, same.id);
          return { kind: 'ok', userId: same.id };
        }
      }
      const created = await users.insertWithIdentity(email !== undefined && profile.emailVerified ? email : null, profile.issuer, profile.subject);
      if (created === null) return { kind: 'conflict' }; // 同時に同じアドレスが登録された
      return { kind: 'ok', userId: created.id };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
