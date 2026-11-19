// ユーザー・外のログイン・メールのトークンの、データの層（PostgreSQL）
// 決まり（パスワードの決まり、結びつけてよいか、など）はサービスの層（services/auth.ts）が確かめる
import type { Queryable } from '../db/pool.ts';

/** このアプリのユーザー（パスワードのハッシュはサービスの層だけが見る） */
export type User = { id: number; email: string | null; passwordHash: string | null; emailVerified: boolean };
export type TokenPurpose = 'verify' | 'reset';

type UserRow = { id: number; email: string | null; password_hash: string | null; email_verified_at: Date | null };

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  passwordHash: row.password_hash,
  emailVerified: row.email_verified_at !== null,
});
const toUserOrNull = (row: UserRow | undefined) => (row === undefined ? null : toUser(row));

/** 一意制約の違反（同じメールアドレスが同時に登録された、など）か */
const isUniqueViolation = (err: unknown) =>
  typeof err === 'object' && err !== null && 'code' in err && err.code === '23505';

export function createPgUserRepo(db: Queryable) {
  return {
    async findById(id: number): Promise<User | null> {
      const { rows } = await db.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
      return toUserOrNull(rows[0]);
    },

    /** email は小文字にそろえてから渡す */
    async findByEmail(email: string): Promise<User | null> {
      const { rows } = await db.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
      return toUserOrNull(rows[0]);
    },

    /** パスワードで登録する。同じアドレスが先に登録されていたら null */
    async insertWithPassword(email: string, passwordHash: string): Promise<User | null> {
      try {
        const { rows } = await db.query<UserRow>(
          'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
          [email, passwordHash],
        );
        return toUserOrNull(rows[0]);
      } catch (err) {
        if (isUniqueViolation(err)) return null;
        throw err;
      }
    },

    async markVerified(id: number): Promise<void> {
      await db.query('UPDATE users SET email_verified_at = coalesce(email_verified_at, now()) WHERE id = $1', [id]);
    },

    async setPassword(id: number, passwordHash: string): Promise<void> {
      await db.query('UPDATE users SET password_hash = $2 WHERE id = $1', [id, passwordHash]);
    },

    /** 外のログイン（issuer と sub）に結びついたユーザーの id。無ければ null */
    async findIdByIdentity(issuer: string, subject: string): Promise<number | null> {
      const { rows } = await db.query<{ user_id: number }>(
        'SELECT user_id FROM user_identities WHERE issuer = $1 AND subject = $2',
        [issuer, subject],
      );
      return rows[0]?.user_id ?? null;
    },

    async linkIdentity(issuer: string, subject: string, userId: number): Promise<void> {
      await db.query(
        'INSERT INTO user_identities (issuer, subject, user_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [issuer, subject, userId],
      );
    },

    /**
     * 外のログインだけのユーザーを作って、結びつける。1つの SQL なので、片方だけができることはない。
     * email は IdP が確かめたものだけを渡す（確かめていなければ null）。同じアドレスが先にあれば null
     */
    async insertWithIdentity(email: string | null, issuer: string, subject: string): Promise<User | null> {
      try {
        const { rows } = await db.query<UserRow>(
          `WITH u AS (
             INSERT INTO users (email, email_verified_at) VALUES ($1, CASE WHEN $1::text IS NULL THEN NULL ELSE now() END) RETURNING *
           ), i AS (
             INSERT INTO user_identities (issuer, subject, user_id) SELECT $2, $3, id FROM u
           )
           SELECT * FROM u`,
          [email, issuer, subject],
        );
        return toUserOrNull(rows[0]);
      } catch (err) {
        if (isUniqueViolation(err)) return null;
        throw err;
      }
    },

    /** メールのトークンを覚える。同じ人・同じ使い道の古いトークンは消す（新しいリンクだけが使える。第53章 練習問題5） */
    async issueToken(userId: number, purpose: TokenPurpose, tokenHash: string, expiresAt: Date): Promise<void> {
      await db.query(
        `WITH old AS (DELETE FROM email_tokens WHERE user_id = $1 AND purpose = $2)
         INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at) VALUES ($3, $1, $2, $4)`,
        [userId, purpose, tokenHash, expiresAt],
      );
    },

    /** トークンを使う。1回だけ（消しながら読む）。期限切れ・使い道違い・知らないものなら null */
    async consumeToken(tokenHash: string, purpose: TokenPurpose): Promise<number | null> {
      const { rows } = await db.query<{ user_id: number }>(
        'DELETE FROM email_tokens WHERE token_hash = $1 AND purpose = $2 AND expires_at > now() RETURNING user_id',
        [tokenHash, purpose],
      );
      return rows[0]?.user_id ?? null;
    },

    async purgeExpiredTokens(): Promise<number> {
      const r = await db.query('DELETE FROM email_tokens WHERE expires_at <= now()');
      return r.rowCount ?? 0;
    },
  };
}

export type UserRepo = ReturnType<typeof createPgUserRepo>;
