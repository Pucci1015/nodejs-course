// 練習問題6 の模範解答
import { withTransaction } from './with-transaction.mjs';

export const JOBS_SQL = `
  CREATE TABLE jobs (
    id          integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kind        text        NOT NULL,
    status      text        NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'running', 'done')),
    worker      text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz
  );
`;

export async function enqueue(pool, kind) {
  const { rows } = await pool.query('INSERT INTO jobs (kind) VALUES ($1) RETURNING id', [kind]);
  return rows[0].id;
}

export async function claimNext(pool, worker) {
  return withTransaction(pool, async (client) => {
    // FOR UPDATE で行をロックし、SKIP LOCKED で、ほかの人がロック中の行は飛ばして次を見る
    const { rows } = await client.query(`
      SELECT id, kind FROM jobs
      WHERE status = 'waiting'
      ORDER BY id
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `);
    if (rows.length === 0) return null;
    await client.query(`UPDATE jobs SET status = 'running', worker = $1 WHERE id = $2`, [worker, rows[0].id]);
    return rows[0];
  });
}

export async function finish(pool, id) {
  const r = await pool.query(`UPDATE jobs SET status = 'done', finished_at = now() WHERE id = $1 AND status = 'running'`, [id]);
  return r.rowCount === 1;
}
