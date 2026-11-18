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
  if (!Number.isInteger(attempt) || attempt < 1) throw new Error(`attempt は 1 以上の整数です: ${attempt}`);
  // 2 ** 50 のような大きな数でも、先に上限で抑えるので困らない
  const cap = Math.min(options.maxMs, options.baseMs * 2 ** (attempt - 1));
  // 「全部散らす」（full jitter）: 0 から cap の間のどこか。同時に失敗したワーカーが、同時に再試行しないように
  return Math.floor(cap * options.random());
}

/** 二度とうまくいかない失敗（再試行しても無駄なもの）を表すエラー */
export class PermanentError extends Error {}

const TEMPORARY_CODES = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN'];

/** 再試行してよい失敗か */
export function isRetryable(err: unknown): boolean {
  if (err instanceof PermanentError) return false;
  if (typeof err !== 'object' || err === null) return true;
  if ('name' in err && err.name === 'TimeoutError') return true; // AbortSignal.timeout の時間切れ
  if ('code' in err && typeof err.code === 'string' && TEMPORARY_CODES.includes(err.code)) return true;
  if ('status' in err && typeof err.status === 'number') {
    return err.status === 429 || err.status >= 500;
  }
  if ('responseCode' in err && typeof err.responseCode === 'number') {
    return err.responseCode < 500; // SMTP の 4xx は「後でもう一度」（第10部 第53章）
  }
  return true;
}
