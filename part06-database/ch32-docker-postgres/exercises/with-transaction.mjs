// 第32章 6.1節で書く、PostgreSQL 用のトランザクションの関数 withTransaction の完成形
// 使い方: const result = await withTransaction(pool, async (client) => { … client.query(…) … });

// プールから接続を1本借り、その接続で BEGIN → fn(client) → COMMIT。fn が例外を投げたら ROLLBACK して投げ直す
// fn の中では、必ず渡された client を使う（pool.query は別の接続に行くので、トランザクションの外になる）
export async function withTransaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release(); // 成功しても失敗しても、接続をプールに返す
  }
}
