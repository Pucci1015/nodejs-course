// 第64章 練習問題7: 仕事を取り続け、止める合図で、今の仕事を終えてから止まるループ（本文 3.2・7節）
import { setTimeout as sleep } from 'node:timers/promises';

export type WorkerDeps<J> = {
  /** 次の仕事を取る。無ければ undefined */
  claim: () => Promise<J | undefined>;
  /** 仕事を処理する */
  handle: (job: J) => Promise<void>;
  /** 処理が成功した */
  complete: (job: J) => Promise<void>;
  /** 処理が失敗した */
  fail: (job: J, err: unknown) => Promise<void>;
  /** 仕事が無いとき、次に聞くまで待つ時間（ミリ秒） */
  idleMs: number;
  /** これが abort されたら、今の仕事を終えてから止まる */
  signal: AbortSignal;
};

export type WorkerStats = { completed: number; failed: number };

/** ms 待つ。signal が abort されたら、すぐ戻る（例外にしない） */
async function idle(ms: number, signal: AbortSignal): Promise<void> {
  try {
    await sleep(ms, undefined, { signal });
  } catch {
    // AbortError: 止める合図。ループの条件で止まる
  }
}

export async function runWorker<J>(deps: WorkerDeps<J>): Promise<WorkerStats> {
  const stats: WorkerStats = { completed: 0, failed: 0 };
  while (!deps.signal.aborted) {
    let job: J | undefined;
    try {
      job = await deps.claim();
    } catch {
      // 取ること自体の失敗（データベースが止まった）。少し待って、また聞く
      await idle(deps.idleMs, deps.signal);
      continue;
    }
    if (job === undefined) {
      await idle(deps.idleMs, deps.signal);
      continue;
    }
    // ここから先は、止める合図が来ても、この仕事を最後まで終える（handle に signal を渡さない）
    try {
      await deps.handle(job);
      await deps.complete(job);
      stats.completed += 1;
    } catch (err) {
      await deps.fail(job, err);
      stats.failed += 1;
    }
  }
  return stats;
}
