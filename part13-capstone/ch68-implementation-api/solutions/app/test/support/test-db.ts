// データベースを直接使うテスト（リポジトリのテストなど）のための、テスト用のスキーマ（第57章 5.1節）
// データベース roombooking の中に test_ で始まるスキーマを作り、アプリと同じマイグレーションを動かす。終わったら丸ごと消す
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { migrate } from '../../src/db/migrate.ts';
import { createPool } from '../../src/db/pool.ts';

export const DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5434/roombooking';

export interface TestDb {
  pool: pg.Pool;
  schema: string;
  /** ユーザーを1人作って、その id を返す（予約には持ち主が要るため） */
  newUser(): Promise<number>;
  /** 接続を閉じて、スキーマを丸ごと消す */
  drop(): Promise<void>;
}

async function adminQuery(sql: string): Promise<void> {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
  } catch (err) {
    throw new Error(
      'PostgreSQL につながりません。このリポジトリで docker compose up -d --wait を動かしてから、もう一度試してください',
      { cause: err },
    );
  }
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

export async function createTestDb(): Promise<TestDb> {
  // 名前に、プロセスの番号と乱数を入れる。テストのファイルを同時に動かしても、ぶつからない
  const schema = `test_${process.pid}_${randomBytes(4).toString('hex')}`;
  await adminQuery(`CREATE SCHEMA ${schema}`); // 自分で作った英数字だけの名前なので、そのまま書いてよい
  const pool = createPool({ url: DATABASE_URL, schema, max: 4 });
  await migrate(pool); // アプリと同じマイグレーション（migrations/）で表を作る
  let count = 0;
  return {
    pool,
    schema,
    async newUser() {
      const { rows } = await pool.query<{ id: number }>(
        'INSERT INTO users (email, email_verified_at) VALUES ($1, now()) RETURNING id',
        [`owner${++count}-${schema}@example.com`],
      );
      const id = rows[0]?.id;
      if (id === undefined) throw new Error('ユーザーを作れませんでした');
      return id;
    },
    async drop() {
      await pool.end();
      await adminQuery(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    },
  };
}
