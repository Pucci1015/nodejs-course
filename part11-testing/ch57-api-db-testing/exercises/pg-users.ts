// 練習問題3 で使う、PostgreSQL のユーザーのリポジトリ（本物。書き換えなくてよい）
import type { Db } from './pg-repo.ts';
import { ConflictError, type User, type UserRepo } from './users.ts';

export const USERS_SQL = `
  CREATE TABLE users (
    id    integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email text NOT NULL UNIQUE CHECK (email = lower(email)),
    name  text NOT NULL
  );
`;

export function createPgUsers(db: Db): UserRepo {
  return {
    async create({ email, name }) {
      try {
        const { rows } = await db.query<User>('INSERT INTO users (email, name) VALUES (lower($1), $2) RETURNING id, email, name', [email, name]);
        return rows[0]!;
      } catch (err) {
        if (typeof err === 'object' && err !== null && 'code' in err && err.code === '23505') {
          throw new ConflictError(`登録済みのアドレスです: ${email}`);
        }
        throw err;
      }
    },
    async findByEmail(email) {
      const { rows } = await db.query<User>('SELECT id, email, name FROM users WHERE email = lower($1)', [email]);
      return rows[0];
    },
    async rename(id, name) {
      const { rows } = await db.query<User>('UPDATE users SET name = $2 WHERE id = $1 RETURNING id, email, name', [id, name]);
      return rows[0];
    },
    async list() {
      const { rows } = await db.query<User>('SELECT id, email, name FROM users ORDER BY id');
      return rows;
    },
  };
}
