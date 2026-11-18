// 追加（第12部）: 後ろで動かす仕事の種類と、仕事を入れる側（第64章 5節、練習問題2）
// 仕事は Redis の列（BullMQ）に入り、ワーカー（worker.ts）が取り出して処理する
import { Queue } from 'bullmq';
import { z } from 'zod';
import type { Mail } from '../auth/mailer.ts';
import type { Redis } from '../redis.ts';

export const QUEUE_NAME = 'jobs';

// 仕事の種類ごとのデータの形。取り出したときに、もう一度確かめる（Redis の中身は、ほかの版のアプリが入れたものかもしれない）
export const JobData = {
  'send-mail': z.strictObject({
    to: z.email(),
    subject: z.string().min(1).max(200),
    text: z.string().min(1),
    html: z.string().optional(),
  }),
  'daily-digest': z.strictObject({ day: z.iso.date().optional() }), // 無ければ、今日（DIGEST_TZ の日付）
  'sweep-blobs': z.strictObject({}),
} as const;
export type JobName = keyof typeof JobData;
export const isJobName = (name: string): name is JobName => Object.hasOwn(JobData, name);

/** 仕事を入れる側。API のプロセスが使う */
export function createJobQueue(connection: Redis, prefix: string) {
  const queue = new Queue(QUEUE_NAME, {
    connection,
    prefix,
    defaultJobOptions: {
      attempts: 6, // 合わせて 6 回まで（1・2・4・8・16 秒あけて）
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { age: 24 * 60 * 60, count: 1000 }, // 終わったものは 1 日・1000 個まで残す
      removeOnFail: { age: 7 * 24 * 60 * 60 }, // 失敗したものは 7 日残す（調べるため）
    },
  });
  return {
    queue,
    /** メールを送る仕事を入れる。送るのは待たない */
    async enqueueMail(mail: Mail): Promise<void> {
      await queue.add('send-mail', JobData['send-mail'].parse(mail));
    },
    /** 今、待っている仕事の数（/metrics で使う） */
    async waiting(): Promise<number> {
      return queue.getWaitingCount();
    },
    close: () => queue.close(),
  };
}

export type JobQueue = ReturnType<typeof createJobQueue>;
