// 第64章 練習問題7: 仕事を取り続け、止める合図で、今の仕事を終えてから止まるループ（本文 3.2・7節）

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

export async function runWorker<J>(deps: WorkerDeps<J>): Promise<WorkerStats> {
  // ここを書く
  throw new Error(`まだ書いていません（${typeof deps}）`);
}
