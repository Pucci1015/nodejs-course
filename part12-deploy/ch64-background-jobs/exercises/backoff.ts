// 第64章 練習問題1: 再試行までの待ち時間と、再試行してよい失敗か（本文 4節）

export type DelayOptions = {
  /** 1 回目の失敗の後に待つ基準（ミリ秒） */
  baseMs: number;
  /** 待ち時間の上限（ミリ秒） */
  maxMs: number;
  /** 0 以上 1 未満の数を返す関数（本番は Math.random。テストでは決まった値） */
  random: () => number;
};

/** attempt 回目（1 から）の失敗の後に、何ミリ秒待つか */
export function retryDelay(attempt: number, options: DelayOptions): number {
  // ここを書く
  throw new Error(`まだ書いていません（${attempt} ${typeof options}）`);
}

/** 二度とうまくいかない失敗（再試行しても無駄なもの）を表すエラー */
export class PermanentError extends Error {}

/** 再試行してよい失敗か */
export function isRetryable(err: unknown): boolean {
  // ここを書く
  throw new Error(`まだ書いていません（${typeof err}）`);
}
