// 追加（第10部）: express-session のセッションを、PostgreSQL の表 sessions に置く（第52章 2.3節の MemoryStore の代わり）
// サーバを2台にしても、起動し直しても、ログインが続く。user_id の列で「その人のセッションを全部消す」ができる
import session from 'express-session';
import type { Queryable } from '../db/pool.ts';

type Callback = (err?: unknown) => void;

/** セッションの期限。Cookie の期限があればそれ、無ければ 1 日 */
function expiresOf(sess: session.SessionData): Date {
  const expires = sess.cookie.expires;
  return expires instanceof Date ? expires : new Date(Date.now() + 24 * 60 * 60 * 1000);
}

export class PgSessionStore extends session.Store {
  readonly #db: Queryable;

  constructor(db: Queryable) {
    super();
    this.#db = db;
  }

  override get(sid: string, callback: (err: unknown, session?: session.SessionData | null) => void): void {
    this.#db
      .query<{ data: session.SessionData }>('SELECT data FROM sessions WHERE sid = $1 AND expires_at > now()', [sid])
      .then(({ rows }) => callback(null, rows[0]?.data ?? null), callback);
  }

  override set(sid: string, sess: session.SessionData, callback?: Callback): void {
    this.#db
      .query(
        `INSERT INTO sessions (sid, user_id, data, expires_at) VALUES ($1, $2, $3, $4)
         ON CONFLICT (sid) DO UPDATE SET user_id = EXCLUDED.user_id, data = EXCLUDED.data, expires_at = EXCLUDED.expires_at`,
        [sid, sess.userId ?? null, JSON.stringify(sess), expiresOf(sess)],
      )
      .then(() => callback?.(), (err: unknown) => callback?.(err));
  }

  override destroy(sid: string, callback?: Callback): void {
    this.#db.query('DELETE FROM sessions WHERE sid = $1', [sid]).then(() => callback?.(), (err: unknown) => callback?.(err));
  }

  /** 使うたびに期限を延ばす（rolling のとき） */
  override touch(sid: string, sess: session.SessionData, callback?: Callback): void {
    this.#db.query('UPDATE sessions SET expires_at = $2 WHERE sid = $1', [sid, expiresOf(sess)]).then(() => callback?.(), (err: unknown) => callback?.(err));
  }

  /** その人のセッションを全部消す（パスワードを変えたとき、すべての端末からログアウト）。exceptSid は残す */
  async destroyAllForUser(userId: number, exceptSid?: string): Promise<void> {
    await this.#db.query('DELETE FROM sessions WHERE user_id = $1 AND sid IS DISTINCT FROM $2', [userId, exceptSid ?? null]);
  }

  /** 期限の切れたものを消す。消した数を返す */
  async purgeExpired(): Promise<number> {
    const r = await this.#db.query('DELETE FROM sessions WHERE expires_at <= now()');
    return r.rowCount ?? 0;
  }
}
