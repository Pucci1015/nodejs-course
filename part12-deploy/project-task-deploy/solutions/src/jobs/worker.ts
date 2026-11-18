// 追加（第12部）: 仕事を取り出して処理するワーカー（第64章 5.3・6・7節）
// API のプロセスの中で動かす（WORKER_MODE=inline）か、別のプロセス（src/worker.ts）で動かす
import { Queue, UnrecoverableError, Worker } from 'bullmq';
import type { Logger } from 'pino';
import type { Mailer } from '../auth/mailer.ts';
import type { Queryable } from '../db/pool.ts';
import type { Redis } from '../redis.ts';
import { isObjectKeyUsed } from '../repositories/pg-attachments.ts';
import type { BlobStore } from '../storage/blob-store.ts';
import { dayIn, sendDailyDigests } from './digest.ts';
import { isJobName, JobData, QUEUE_NAME } from './jobs.ts';
import { redisSentStore, sendMailJob } from './mail.ts';
import { sweepOrphans } from './sweep.ts';

export type JobWorkerDeps = {
  /** ワーカーが待ち受けに使う接続（ほかに使わない） */
  connection: Redis;
  /** 送ったことを覚えるなど、ふつうのコマンドに使う接続 */
  redis: Redis;
  prefix: string;
  db: Queryable;
  mailer: Mailer;
  blobs: BlobStore;
  logger: Logger;
  appUrl: string;
  digest: { cron: string; tz: string };
  sweepGraceMs: number;
  concurrency?: number;
};

export async function startJobWorker(deps: JobWorkerDeps) {
  const { connection, redis, prefix, db, mailer, blobs, logger, appUrl, digest } = deps;
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
        case 'send-mail': {
          const mail = JobData['send-mail'].parse(job.data);
          return sendMailJob(job.id, mail, mailer, sent);
        }
        case 'daily-digest': {
          const { day } = JobData['daily-digest'].parse(job.data);
          return sendDailyDigests(db, mailer, day ?? dayIn(digest.tz, new Date()), appUrl);
        }
        case 'sweep-blobs': {
          const r = await sweepOrphans({
            blobs,
            prefix: 'users/',
            isReferenced: (key) => isObjectKeyUsed(db, key),
            graceMs: deps.sweepGraceMs,
            now: new Date(),
          });
          return { deleted: r.deleted.length, scanned: r.scanned };
        }
      }
    },
    { connection, prefix, concurrency: deps.concurrency ?? 4 },
  );
  // ログには、宛先やメールの中身を書かない（仕事の名前・ID・結果だけ）
  worker.on('completed', (job, result: unknown) =>
    logger.info(
      { job: job.name, jobId: job.id, result: job.name === 'send-mail' ? result : JSON.stringify(result) },
      '仕事が終わりました',
    ),
  );
  worker.on('failed', (job, err) =>
    logger.warn({ job: job?.name, jobId: job?.id, attemptsMade: job?.attemptsMade, err }, '仕事が失敗しました'),
  );
  worker.on('error', (err) => logger.error({ err }, 'ワーカーのエラー'));

  // 決まった時刻の仕事を登録する。同じ ID なら上書きなので、起動のたびに呼んでよい（第64章 6節）
  const scheduler = new Queue(QUEUE_NAME, { connection: redis, prefix });
  await scheduler.upsertJobScheduler(
    'daily-digest',
    { pattern: digest.cron, tz: digest.tz },
    { name: 'daily-digest', data: {} },
  );
  await scheduler.upsertJobScheduler('sweep-blobs', { every: 60 * 60 * 1000 }, { name: 'sweep-blobs', data: {} });
  await scheduler.close();

  return {
    worker,
    /** 新しい仕事を取らず、処理中のものが終わるのを待つ */
    close: () => worker.close(),
  };
}
