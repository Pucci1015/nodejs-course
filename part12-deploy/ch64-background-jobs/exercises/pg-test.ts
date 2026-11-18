// テストの部品: テストごとに、新しいスキーマを作って渡し、終わったら消す。書き換えなくてよいファイル
// つなぐ先は DATABASE_URL（既定は第6部の compose の taskapi）。本文で作った ch64.jobs には触らない
import { randomBytes } from 'node:crypto';
import pg from 'pg';

export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5433/taskapi';

export async function withTestSchema(fn: (pool: pg.Pool, schema: string) => Promise<void>): Promise<void> {
  const schema = `test_${process.pid}_${randomBytes(4).toString('hex')}`;
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4 });
  try {
    await pool.query(`CREATE SCHEMA ${schema}`);
    await fn(pool, schema);
  } finally {
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await pool.end();
  }
}
