// 仕事を取り出して処理するワーカー（第64章 5.3・7節）
// API のプロセスの中で動かす（WORKER_MODE=inline）か、別のプロセス（src/worker.ts）で動かす
// 土台はメールを送る仕事だけ。予約のリマインドなどは、第69章で足す
import { UnrecoverableError, Worker } from 'bullmq';
import type { Logger } from 'pino';
import type { Mailer } from '../auth/mailer.ts';
import type { Redis } from '../redis.ts';
import { isJobName, JobData, QUEUE_NAME } from './jobs.ts';
import { redisSentStore, sendMailJob } from './mail.ts';

export type JobWorkerDeps = {
  /** ワーカーが待ち受けに使う接続（ほかに使わない） */
  connection: Redis;
  /** 送ったことを覚えるなど、ふつうのコマンドに使う接続 */
  redis: Redis;
  prefix: string;
  mailer: Mailer;
  logger: Logger;
  concurrency?: number;
};

export async function startJobWorker(deps: JobWorkerDeps) {
  const { connection, redis, prefix, mailer, logger } = deps;
  const sent = redisSentStore(redis, prefix);

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (!isJobName(job.name)) throw new UnrecoverableError(`知らない仕事です: ${job.name}`);
      // データの形を確かめる。違えば、何回やり直しても直らない
      const parsed = JobData[job.name].safeParse(job.data);
      if (!parsed.success)
        throw new UnrecoverableError(`データの形が違います: ${parsed.error.issues[0]?.message ?? ''}`);
      return sendMailJob(job.id, parsed.data, mailer, sent);
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

  return {
    worker,
    /** 新しい仕事を取らず、処理中のものが終わるのを待つ */
    close: () => worker.close(),
  };
}
