// 仕事を取り出して処理するワーカー（第64章 5.3・7節）
// API のプロセスの中で動かす（WORKER_MODE=inline）か、別のプロセス（src/worker.ts）で動かす
// 仕事は2つ: メールを送る（send-mail）・前日のリマインド（send-reminders。毎日決まった時刻）
import { Queue, UnrecoverableError, Worker } from 'bullmq';
import type pg from 'pg';
import type { Logger } from 'pino';
import type { Mailer } from '../auth/mailer.ts';
import type { Redis } from '../redis.ts';
import { isJobName, JobData, QUEUE_NAME } from './jobs.ts';
import { redisSentStore, sendMailJob } from './mail.ts';
import { sendReminders, tomorrowOf } from './reminders.ts';

export type JobWorkerDeps = {
  /** ワーカーが待ち受けに使う接続（ほかに使わない） */
  connection: Redis;
  /** 送ったことを覚えるなど、ふつうのコマンドに使う接続 */
  redis: Redis;
  prefix: string;
  mailer: Mailer;
  logger: Logger;
  pool: pg.Pool;
  appUrl: string;
  /** リマインドを送る時刻（cron の形。日本の時刻） */
  reminderCron: string;
  concurrency?: number;
};

export async function startJobWorker(deps: JobWorkerDeps) {
  const { connection, redis, prefix, mailer, logger, pool, appUrl } = deps;
  const sent = redisSentStore(redis, prefix);

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (!isJobName(job.name)) throw new UnrecoverableError(`知らない仕事です: ${job.name}`);
      // データの形を確かめる。違えば、何回やり直しても直らない
      const parsed = JobData[job.name].safeParse(job.data);
      if (!parsed.success)
        throw new UnrecoverableError(`データの形が違います: ${parsed.error.issues[0]?.message ?? ''}`);
      switch (job.name) {
        case 'send-mail':
          return sendMailJob(job.id, JobData['send-mail'].parse(job.data), mailer, sent);
        case 'send-reminders': {
          const { day } = JobData['send-reminders'].parse(job.data);
          return sendReminders(pool, mailer, day ?? tomorrowOf(new Date()), appUrl);
        }
      }
    },
    { connection, prefix, concurrency: deps.concurrency ?? 4 },
  );
  // ログには、宛先やメールの中身を書かない（仕事の名前・ID・結果だけ）
  worker.on('completed', (job, result: unknown) =>
    logger.info({ job: job.name, jobId: job.id, result: JSON.stringify(result) }, '仕事が終わりました'),
  );
  worker.on('failed', (job, err) =>
    logger.warn({ job: job?.name, jobId: job?.id, attemptsMade: job?.attemptsMade, err }, '仕事が失敗しました'),
  );
  worker.on('error', (err) => logger.error({ err }, 'ワーカーのエラー'));
  await worker.waitUntilReady();

  // 決まった時刻の仕事を登録する。同じ ID なら上書きなので、起動のたびに呼んでよい（第64章 6節）
  // 時刻は日本の時刻で数える（tz）。サーバの時計が UTC でも、18:00 は日本の 18:00
  const scheduler = new Queue(QUEUE_NAME, { connection: redis, prefix });
  await scheduler.upsertJobScheduler(
    'send-reminders',
    { pattern: deps.reminderCron, tz: 'Asia/Tokyo' },
    { name: 'send-reminders', data: {} },
  );
  await scheduler.close();

  return {
    worker,
    /** 新しい仕事を取らず、処理中のものが終わるのを待つ */
    close: () => worker.close(),
  };
}
