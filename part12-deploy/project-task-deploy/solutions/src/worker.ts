// 追加（第12部）: ワーカーだけを動かすプロセス（WORKER_MODE=separate のとき。第64章 7節）
// 動かし方: npm run worker（Render では Background Worker として。render.yaml）
// API とは別のプロセスなので、重い仕事（たくさんのメール）が API の応答を遅くしない。台の数も別に決められる
import pino from 'pino';
import { createSmtpMailer } from './auth/mailer.ts';
import { type Config, loadConfig } from './config.ts';
import { createPool, redactUrl } from './db/pool.ts';
import { startJobWorker } from './jobs/worker.ts';
import { createRedis, redactRedisUrl } from './redis.ts';
import { createS3BlobStore } from './storage/s3-blob-store.ts';

let config: Config;
try {
  config = loadConfig(process.env);
} catch (e) {
  console.error(JSON.stringify({ level: 60, msg: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
}
const logger = pino({ level: config.logLevel }).child({ process: 'worker' });

const pool = createPool({ url: config.databaseUrl, schema: config.databaseSchema, max: 4 });
pool.on('error', (err) => logger.error({ err }, 'データベースの接続が切れました'));
const redis = createRedis(config.redisUrl, logger, 'main');
const connection = createRedis(config.redisUrl, logger, 'worker');
try {
  await pool.query('SELECT 1'); // マイグレーションは API（か preDeployCommand）が動かす。ここでは、つながるかだけ
  await Promise.all([redis.connect(), connection.connect()]);
} catch (err) {
  logger.fatal(
    { err, database: redactUrl(config.databaseUrl), redis: redactRedisUrl(config.redisUrl) },
    'つながりませんでした',
  );
  process.exit(1);
}
const blobs = createS3BlobStore(config.s3);
const worker = await startJobWorker({
  connection,
  redis,
  prefix: config.queuePrefix,
  db: pool,
  mailer: createSmtpMailer(config.smtp),
  blobs,
  logger,
  appUrl: config.appUrl,
  digest: config.digest,
  sweepGraceMs: config.sweepGraceMs,
});
logger.info('仕事を待っています');

let stopping = false;
async function stop(signal: string): Promise<void> {
  if (stopping) return;
  stopping = true;
  logger.info({ signal }, '処理中の仕事を終えてから止まります');
  // 時間内に終わらなければ、あきらめる。終わらなかった仕事は、BullMQ が「止まった仕事」として、ほかのワーカーに回す
  setTimeout(() => {
    logger.error('時間内に終わらなかったので終了します');
    process.exit(1);
  }, config.shutdownTimeoutMs).unref();
  await worker.close();
  await Promise.all([redis.close(), connection.close()]);
  blobs.destroy();
  await pool.end();
  logger.info('stopped');
}
const onSignal = (signal: string) => {
  stop(signal).catch((err: unknown) => {
    logger.error({ err }, '止めるときにエラーが起きました');
    process.exitCode = 1;
  });
};
process.on('SIGTERM', () => onSignal('SIGTERM'));
process.on('SIGINT', () => onSignal('SIGINT'));
