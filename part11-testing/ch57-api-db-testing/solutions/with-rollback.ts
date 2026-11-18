// 練習問題8 の模範解答: テストの中で書いたものを、最後に必ず取り消す
import type { Pool, PoolClient } from 'pg';

export async function withRollback<T>(pool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  // 追加: 1つの接続を借りる。BEGIN〜ROLLBACK は、同じ接続で送らないと意味が無い（第6部 第32章 5節）
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    return await fn(client); // await を付けないと、fn の例外が finally の後に届く
  } finally {
    // 成功しても失敗しても、取り消して返す
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }
}
