// 練習問題で使う、本文の samples のコピーに、引数 extraSql を足したもの（書き換えなくてよい）。第57章 5節: テストのためのデータベース。テストのファイル（や、テスト）ごとに、空のスキーマを作って消す
// 第6部 第32章 練習問題の pg-test.mjs を、TypeScript にして小さくしたもの
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { SCHEMA_SQL } from './pg-repo.ts';

export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5433/taskapi';

export interface TestDb {
  pool: pg.Pool;
  schema: string;
  /** 接続を閉じて、スキーマを丸ごと消す */
  drop(): Promise<void>;
}

/** extraSql: タスクの表のほかに作るもの（練習問題3のユーザーの表など） */
export async function createTestDb(extraSql = ''): Promise<TestDb> {
  // 名前に、プロセスの番号と乱数を入れる。テストのファイルを同時に動かしても、ぶつからない
  const schema = `test_${process.pid}_${randomBytes(4).toString('hex')}`;
  const admin = new pg.Client({ connectionString: DATABASE_URL });
  try {
    await admin.connect();
  } catch (err) {
    throw new Error('テスト用のデータベースにつなげません。第6部の compose（PostgreSQL 5433）は動いていますか', { cause: err });
  }
  await admin.query(`CREATE SCHEMA ${schema}`); // 名前は自分で作った英数字だけなので、そのまま書いてよい
  await admin.end();

  // このプールの接続は、どれも search_path がこのスキーマになる（テーブルの名前を、そのまま書ける）
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4, options: `-c search_path=${schema}` });
  await pool.query(SCHEMA_SQL + extraSql);

  return {
    pool,
    schema,
    async drop() {
      await pool.end();
      const client = new pg.Client({ connectionString: DATABASE_URL });
      await client.connect();
      await client.query(`DROP SCHEMA ${schema} CASCADE`);
      await client.end();
    },
  };
}
