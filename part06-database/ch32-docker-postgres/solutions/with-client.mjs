// 練習問題3 の模範解答

export async function withClient(pool, fn) {
  const client = await pool.connect();
  try {
    return await fn(client); // await を付けないと、fn が終わる前に finally に進み、使っている途中の接続を返してしまう
  } finally {
    client.release();
  }
}

export async function withTransaction(pool, fn) {
  return withClient(pool, async (client) => {
    await client.query('BEGIN');
    try {
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });
}
