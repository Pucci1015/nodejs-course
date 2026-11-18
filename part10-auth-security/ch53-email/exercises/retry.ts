// 第53章 練習問題6: 一時的な失敗だけを、間を空けてやり直す（本文3.3節）
import type { Mail } from './mailer.ts';

export type RetryOptions = { retries?: number; baseDelayMs?: number; sleep?: (ms: number) => Promise<void> };

/** やり直せば届くかもしれない失敗か */
export function isTransient(err: unknown): boolean {
  // ここを書く
  throw new Error(`まだ書いていません: ${String(err)}`);
}

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** 送れたら、何回目で送れたかを返す。やり直してもだめなら、最後のエラーを投げる */
export async function sendWithRetry(
  send: (mail: Mail) => Promise<void>,
  mail: Mail,
  { retries = 3, baseDelayMs = 1000, sleep = realSleep }: RetryOptions = {},
): Promise<number> {
  // ここを書く
  void [send, mail, retries, baseDelayMs, sleep];
  throw new Error('まだ書いていません');
}
