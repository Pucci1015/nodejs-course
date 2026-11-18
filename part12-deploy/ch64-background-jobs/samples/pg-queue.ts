// 第64章 3節: PostgreSQL の表を、仕事の列（キュー）にする。ほかのサンプルが import する
// 表は、データベース taskapi のスキーマ ch64 に作る（成果物の表とぶつからないように）
import pg from 'pg';

export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5433/taskapi';

export const SCHEMA_SQL = `
CREATE SCHEMA IF NOT EXISTS ch64;
CREATE TABLE IF NOT EXISTS ch64.jobs (
  id           bigserial PRIMARY KEY,
  kind         text NOT NULL,
  payload      jsonb NOT NULL,
  run_at       timestamptz NOT NULL DEFAULT now(),  -- この時刻を過ぎたら取ってよい
  locked_until timestamptz,                         -- だれかが処理中なら、その期限
  attempts     integer NOT NULL DEFAULT 0,
  done_at      timestamptz,
  last_error   text
);
CREATE INDEX IF NOT EXISTS jobs_ready ON ch64.jobs (run_at) WHERE done_at IS NULL;
`;

export type Job = { id: string; kind: string; payload: unknown; attempts: number };

export async function enqueue(pool: pg.Pool, kind: string, payload: unknown): Promise<string> {
  const { rows } = await pool.query<{ id: string }>('INSERT INTO ch64.jobs (kind, payload) VALUES ($1, $2) RETURNING id', [
    kind,
    JSON.stringify(payload),
  ]);
  return rows[0]!.id;
}

/** 次の仕事を1つ取る。無ければ undefined。lockSeconds の間に終わらなければ、ほかのワーカーがまた取れる */
export async function claimNext(pool: pg.Pool, lockSeconds: number, lock = 'FOR UPDATE SKIP LOCKED'): Promise<Job | undefined> {
  const { rows } = await pool.query<Job>(
    `UPDATE ch64.jobs
        SET locked_until = now() + make_interval(secs => $1), attempts = attempts + 1
      WHERE id = (
        SELECT id FROM ch64.jobs
         WHERE done_at IS NULL AND run_at <= now() AND (locked_until IS NULL OR locked_until < now())
         ORDER BY run_at, id
         LIMIT 1
         ${lock}
      )
      RETURNING id, kind, payload, attempts`,
    [lockSeconds],
  );
  return rows[0];
}

export async function complete(pool: pg.Pool, id: string): Promise<void> {
  await pool.query('UPDATE ch64.jobs SET done_at = now(), locked_until = NULL WHERE id = $1', [id]);
}
