// メールを送る仕事の処理（第64章 練習問題6の mail-processor.ts から）
// 2 回送らない（送ったことを Redis に覚える）・直らない失敗は再試行しない
import { UnrecoverableError } from 'bullmq';
import type { Mail, Mailer } from '../auth/mailer.ts';

/** 送ったことを覚えておく場所 */
export type SentStore = { has(key: string): Promise<boolean>; add(key: string): Promise<void> };

/** Redis で SentStore を作る。7 日たったら忘れる（その前に、同じ仕事が再試行されることはない） */
export function redisSentStore(
  redis: {
    exists(key: string): Promise<number>;
    set(key: string, value: string, options: { EX: number }): Promise<unknown>;
  },
  prefix: string,
): SentStore {
  return {
    has: async (key) => (await redis.exists(`${prefix}:sent:${key}`)) === 1,
    add: async (key) => {
      await redis.set(`${prefix}:sent:${key}`, '1', { EX: 7 * 24 * 60 * 60 });
    },
  };
}

export async function sendMailJob(
  jobId: string | undefined,
  mail: Mail,
  mailer: Mailer,
  sent: SentStore,
): Promise<'sent' | 'skipped'> {
  const key = `mail:${jobId ?? ''}`;
  if (await sent.has(key)) return 'skipped';
  try {
    await mailer.send(mail);
  } catch (err) {
    // SMTP の 5xx（宛先が無いなど）は、直らない失敗（第10部 第53章）。BullMQ に再試行させない
    if (typeof err === 'object' && err !== null && 'responseCode' in err && Number(err.responseCode) >= 500) {
      throw new UnrecoverableError(`送れません: ${err instanceof Error ? err.message : ''}`);
    }
    throw err; // ほかは、BullMQ が待ってから再試行する
  }
  // 送った直後に覚える。ここより後で失敗して再試行されても、もう送らない
  await sent.add(key);
  return 'sent';
}
