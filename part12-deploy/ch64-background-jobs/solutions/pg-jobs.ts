// 第64章 練習問題5: PostgreSQL の仕事の列に、失敗の扱い（待ってから再試行・あきらめる）を足す（本文 3・4節）
import type pg from 'pg';

export type Job = { id: string; kind: string; payload: unknown; attempts: number };

export type PgJobs = {
  /** 表を作る（あれば何もしない） */
  setup(): Promise<void>;
  enqueue(kind: string, payload: unknown, options?: { maxAttempts?: number }): Promise<string>;
  claimNext(lockSeconds: number): Promise<Job | undefined>;
  complete(id: string): Promise<void>;
  /** 失敗を書く。まだ回数が残っていれば delayMs 後に取れるようにして 'retry'、残っていなければ 'dead' */
  fail(job: Job, error: string, delayMs: number): Promise<'retry' | 'dead'>;
  /** あきらめた仕事（新しいものから） */
  listDead(): Promise<{ id: string; kind: string; attempts: number; lastError: string }[]>;
};

/** schema（英小文字・数字・_ だけ）の中の jobs の表を使う */
export function createPgJobs(pool: pg.Pool, schema: string): PgJobs {
  // 表の名前はプレースホルダ（$1）にできないので、決まった形の名前だけを受け付けてから埋め込む（第6部 第31章）
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error(`schema の名前が正しくありません: ${schema}`);
  const t = `${schema}.jobs`;

  return {
    async setup() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${t} (
          id           bigserial PRIMARY KEY,
          kind         text NOT NULL,
          payload      jsonb NOT NULL,
          run_at       timestamptz NOT NULL DEFAULT now(),
          locked_until timestamptz,
          attempts     integer NOT NULL DEFAULT 0,
          max_attempts integer NOT NULL DEFAULT 5,   -- 追加: 何回まで試すか
          done_at      timestamptz,
          dead_at      timestamptz,                  -- 追加: あきらめた時刻
          last_error   text
        );
        CREATE INDEX IF NOT EXISTS jobs_ready ON ${t} (run_at) WHERE done_at IS NULL AND dead_at IS NULL;
      `);
    },

    async enqueue(kind, payload, options = {}) {
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO ${t} (kind, payload, max_attempts) VALUES ($1, $2, $3) RETURNING id`,
        [kind, JSON.stringify(payload), options.maxAttempts ?? 5],
      );
      return rows[0]!.id;
    },

    async claimNext(lockSeconds) {
      const { rows } = await pool.query<Job>(
        `UPDATE ${t}
            SET locked_until = now() + make_interval(secs => $1), attempts = attempts + 1
          WHERE id = (
            SELECT id FROM ${t}
             WHERE done_at IS NULL AND dead_at IS NULL AND run_at <= now()
               AND (locked_until IS NULL OR locked_until < now())
             ORDER BY run_at, id
             LIMIT 1
             FOR UPDATE SKIP LOCKED
          )
          RETURNING id, kind, payload, attempts`,
        [lockSeconds],
      );
      return rows[0];
    },

    async complete(id) {
      await pool.query(`UPDATE ${t} SET done_at = now(), locked_until = NULL WHERE id = $1`, [id]);
    },

    async fail(job, error, delayMs) {
      // 回数が残っていれば、run_at を先にずらしてロックを外す。残っていなければ dead_at を書く。1 つの UPDATE で決める
      const { rows } = await pool.query<{ dead: boolean }>(
        `UPDATE ${t}
            SET last_error = $2,
                locked_until = NULL,
                run_at = CASE WHEN attempts < max_attempts THEN now() + make_interval(secs => $3) ELSE run_at END,
                dead_at = CASE WHEN attempts < max_attempts THEN NULL ELSE now() END
          WHERE id = $1
          RETURNING dead_at IS NOT NULL AS dead`,
        [job.id, error, delayMs / 1000],
      );
      return rows[0]?.dead === true ? 'dead' : 'retry';
    },

    async listDead() {
      const { rows } = await pool.query<{ id: string; kind: string; attempts: number; lastError: string }>(
        `SELECT id, kind, attempts, last_error AS "lastError" FROM ${t} WHERE dead_at IS NOT NULL ORDER BY dead_at DESC, id DESC`,
      );
      return rows;
    },
  };
}
