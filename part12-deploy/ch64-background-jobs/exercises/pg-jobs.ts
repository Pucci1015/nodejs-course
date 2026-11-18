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
  // ここを書く
  throw new Error(`まだ書いていません（${typeof pool} ${schema}）`);
}
