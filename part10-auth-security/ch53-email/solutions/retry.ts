// 第53章 練習問題6 の模範解答: 一時的な失敗だけを、間を空けてやり直す（本文3.3節）
import type { Mail } from '../exercises/mailer.ts';

export type RetryOptions = { retries?: number; baseDelayMs?: number; sleep?: (ms: number) => Promise<void> };

const TRANSIENT_CODES = new Set(['ESOCKET', 'ETIMEDOUT', 'ECONNECTION']);

/** やり直せば届くかもしれない失敗か */
export function isTransient(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  // SMTP の応答があれば、それで決める（4xx は一時的、5xx はずっと）
  if ('permanent' in err && typeof err.permanent === 'boolean') return !err.permanent;
  if ('responseCode' in err && typeof err.responseCode === 'number') return err.responseCode >= 400 && err.responseCode < 500;
  // 応答が無い（つながらない・途中で切れた）
  return 'code' in err && typeof err.code === 'string' && TRANSIENT_CODES.has(err.code);
}

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** 送れたら、何回目で送れたかを返す。やり直してもだめなら、最後のエラーを投げる */
export async function sendWithRetry(
  send: (mail: Mail) => Promise<void>,
  mail: Mail,
  { retries = 3, baseDelayMs = 1000, sleep = realSleep }: RetryOptions = {},
): Promise<number> {
  for (let attempt = 1; ; attempt++) {
    try {
      await send(mail);
      return attempt;
    } catch (err) {
      if (attempt > retries || !isTransient(err)) throw err;
      await sleep(baseDelayMs * 2 ** (attempt - 1)); // 1秒、2秒、4秒 …
    }
  }
}
