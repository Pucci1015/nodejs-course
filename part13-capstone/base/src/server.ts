// 起動（コンポジションルート。第26章 4節）: 設定 → ログ → データベース → Redis → 組み立て → listen → 止める
// どの実物（PostgreSQL・Redis・SMTP）を使うかを知っているのは、このファイルだけ。ほかのファイルは受け取ったものを使う
import type { AddressInfo } from 'node:net';
import pino from 'pino';
import { createApp } from './app.ts';
import { createSmtpMailer, type Mail } from './auth/mailer.ts';
import { createOidcClient } from './auth/oidc.ts';
import { PgSessionStore } from './auth/pg-session-store.ts';
import { type Config, loadConfig } from './config.ts';
import { migrate } from './db/migrate.ts';
import { createPool, redactUrl } from './db/pool.ts';
import { createJobQueue } from './jobs/jobs.ts';
import { startJobWorker } from './jobs/worker.ts';
import { createMetrics } from './lib/metrics.ts';
import { createRedis, redactRedisUrl } from './redis.ts';
import { createPgUserRepo } from './repositories/pg-users.ts';
import { createAuthService } from './services/auth.ts';

// 設定は起動するときに1回だけ確かめる。間違っていたら、理由（名前だけ）を書いて終了コード 1
let config: Config;
try {
  config = loadConfig(process.env);
} catch (e) {
  // ロガーを作る前なので、同じ形の JSON を自分で書く
  console.error(JSON.stringify({ level: 60, msg: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
}

// ログは1行1つの JSON。秘密のヘッダは書く前に隠す
const logger = pino({
  level: config.logLevel,
  redact: { paths: ['req.headers.authorization', 'req.headers.cookie'], censor: '[redacted]' },
});

// データベースにつなぎ、まだのマイグレーションを動かす。つなげなければ、理由を書いて終了コード 1
const pool = createPool({ url: config.databaseUrl, schema: config.databaseSchema, max: config.databasePoolMax });
// 使っていない接続が切れたときのエラー。受け取らないと、プロセスが落ちる（プールは、次から新しい接続を作る）
pool.on('error', (err) => logger.error({ err }, 'データベースの接続が切れました'));
try {
  const applied = await migrate(pool);
  if (applied.length > 0) logger.info({ applied }, 'マイグレーションを動かしました');
} catch (err) {
  // URL にはパスワードが入っているので、隠してから書く
  logger.fatal({ err, database: redactUrl(config.databaseUrl) }, 'データベースを準備できませんでした');
  await pool.end();
  process.exit(1);
}

// Redis につなぐ。つながらなければ、理由を書いて終了コード 1（起動したのに仕事を入れられない、を避ける）
const redis = createRedis(config.redisUrl, logger, 'main'); // 送ったメールを覚える・/readyz
const queueConnection = createRedis(config.redisUrl, logger, 'queue'); // 仕事を入れる（BullMQ）
try {
  await Promise.all([redis.connect(), queueConnection.connect()]);
} catch (err) {
  logger.fatal({ err, redis: redactRedisUrl(config.redisUrl) }, 'Redis につながりませんでした');
  await pool.end();
  process.exit(1);
}

// 組み立て
const metrics = createMetrics();
const jobs = createJobQueue(queueConnection, config.queuePrefix);
const users = createPgUserRepo(pool);
const sessionStore = new PgSessionStore(pool);
const mailer = createSmtpMailer(config.smtp);
/** メールを送る。その場で送らず、仕事の列に入れる（第64章 4節）。待たない（応答の時間で、登録済みかが分からないように。第53章 5.3節） */
const deliver = (mail: Mail): void => {
  jobs
    .enqueueMail(mail)
    .catch((err: unknown) => logger.error({ err, subject: mail.subject }, 'メールを列に入れられませんでした'));
};
// WORKER_MODE=inline なら、このプロセスの中でワーカーも動かす（開発・テスト・小さな本番）
let workerConnection: ReturnType<typeof createRedis> | undefined;
let jobWorker: Awaited<ReturnType<typeof startJobWorker>> | undefined;
if (config.workerMode === 'inline') {
  workerConnection = createRedis(config.redisUrl, logger, 'worker');
  await workerConnection.connect();
  jobWorker = await startJobWorker({ connection: workerConnection, redis, prefix: config.queuePrefix, mailer, logger });
}
const auth = createAuthService({ users, appUrl: config.appUrl, deliver });
// 練習用の IdP（第54章）。設定が無ければ使わない
const oidc =
  config.oidc === undefined
    ? undefined
    : createOidcClient({ ...config.oidc, redirectUri: `${config.appUrl}/api/auth/idp/callback` });

// 期限の切れたセッションとメールのトークンを、1時間ごとに消す。unref() で、このタイマーのためにプロセスを残さない
const purgeTimer = setInterval(
  () => {
    sessionStore.purgeExpired().catch((err: unknown) => logger.error({ err }, 'セッションを消せませんでした'));
    users.purgeExpiredTokens().catch((err: unknown) => logger.error({ err }, 'メールのトークンを消せませんでした'));
  },
  60 * 60 * 1000,
).unref();

let ready = true;
const app = createApp({
  logger,
  config,
  isReady: () => ready,
  auth,
  users,
  sessionStore,
  oidc,
  metrics,
  checks: {
    database: async () => pool.query('SELECT 1'),
    redis: async () => redis.ping(),
  },
});
metrics.addGauge({ name: 'jobs_waiting', help: '列で待っている仕事の数', read: () => jobs.waiting() });

const server = app.listen(config.port, config.host, () => {
  // TCP のポートで listen した後なので、address() は AddressInfo（第37章 7.1節）
  const { port } = server.address() as AddressInfo;
  logger.info({ url: `http://${config.host}:${port}` }, 'listening');
});
// 起動の失敗（ポートが使われている、など）もログに書いて、終了コード 1
server.on('error', (err) => {
  logger.fatal({ err }, '起動できませんでした');
  process.exit(1);
});

/** リクエストが全部終わった後の片付け。後ろのものほど前のものが使うので、後で閉じる */
async function cleanup(): Promise<void> {
  clearInterval(purgeTimer);
  await jobWorker?.close(); // 処理中の仕事を終えてから止まる
  await jobs.close();
  await Promise.all([redis.close(), queueConnection.close(), workerConnection?.close()]);
  metrics.stop();
  await pool.end();
  logger.info('stopped');
  process.exitCode = 0;
}

let stopping = false;
function shutdown(signal: NodeJS.Signals): void {
  if (stopping) return;
  stopping = true;
  ready = false;
  logger.info({ signal }, 'shutting down');

  // 時間内に終わらなければ、あきらめて終了コード 1。unref() で、このタイマーのためにプロセスを残さない
  setTimeout(() => {
    logger.error({ timeoutMs: config.shutdownTimeoutMs }, '時間内に終わらなかったので終了します');
    process.exit(1);
  }, config.shutdownDelayMs + config.shutdownTimeoutMs).unref();

  setTimeout(() => {
    server.close(() => {
      // 失敗したら、ログに書いて終了コード 1（ESLint の no-misused-promises: async の関数を渡さない）
      cleanup().catch((err: unknown) => {
        logger.error({ err }, '止めるときにエラーが起きました');
        process.exitCode = 1;
      });
    });
  }, config.shutdownDelayMs);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
