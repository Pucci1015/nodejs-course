// 起動（コンポジションルート。第26章 4節）: loadConfig → logger → pool → migrate → repo → hub → service → app → listen → shutdown
// 第26章 練習問題9の模範解答（ch26-app-structure/solutions/server.mjs）から始めて、組み立てと SSE の片付けを足した
// 第6部: データの層を PostgreSQL に替え、起動のときにマイグレーションを動かし、止めるときにプールを閉じる（「追加（第6部）」「変更（第6部）」）
// 変更（第7部）: TypeScript にした。node src/server.ts で、そのまま動く（Node.js の型の除去）
// 追加（第10部）: ユーザー・セッション・メール・練習用の IdP を組み立てる。タスクのサービスとハブは、ログインしている人ごとに作る
import type { AddressInfo } from 'node:net';
import type { Request } from 'express';
import pino from 'pino';
import { createApp } from './app.ts';
import { createSmtpMailer, type Mail } from './auth/mailer.ts';
import { createOidcClient } from './auth/oidc.ts';
import { PgSessionStore } from './auth/pg-session-store.ts';
import { type Config, loadConfig } from './config.ts';
import { migrate } from './db/migrate.ts';
import { createPool, redactUrl } from './db/pool.ts';
import { createUserHubs, sseRoute } from './lib/event-hub.ts';
import { createPgIdempotencyStore } from './repositories/pg-idempotency.ts';
import { createPgTaskRepo } from './repositories/pg-tasks.ts';
import { createPgUserRepo } from './repositories/pg-users.ts';
import { createAuthService } from './services/auth.ts';
import { createTaskService } from './services/tasks.ts';

// 設定は起動するときに1回だけ確かめる。間違っていたら、理由（名前だけ）を書いて終了コード 1
let config: Config;
try {
  config = loadConfig(process.env);
} catch (e) {
  // ロガーを作る前なので、同じ形の JSON を自分で書く。変更（第7部）: e は unknown
  console.error(JSON.stringify({ level: 60, msg: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
}

// ログは1行1つの JSON。秘密のヘッダは書く前に隠す
const logger = pino({ level: config.logLevel, redact: { paths: ['req.headers.authorization', 'req.headers.cookie'], censor: '[redacted]' } });

// 追加（第6部）: データベースにつなぎ、まだのマイグレーションを動かす。つなげなければ、理由を書いて終了コード 1
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

// 組み立て。ここだけが「どの実物を使うか」を知っている
const hubs = createUserHubs({ bufferSize: 100 }); // 変更（第10部）: ハブは人ごと
const idempotencyStore = createPgIdempotencyStore(pool); // 追加（第6部）
// 追加（第10部）: ユーザー・セッション・メール
const users = createPgUserRepo(pool);
const sessionStore = new PgSessionStore(pool);
const mailer = createSmtpMailer(config.smtp);
/** メールを送る。待たない（応答の時間で、登録済みかが分からないように。第53章 5.3節）。失敗はログに書く（宛先は書かない） */
const deliver = (mail: Mail): void => {
  mailer.send(mail).catch((err: unknown) => logger.error({ err, subject: mail.subject }, 'メールを送れませんでした'));
};
const auth = createAuthService({ users, appUrl: config.appUrl, deliver });
// 追加（第10部）: 練習用の IdP。設定が無ければ使わない
const oidc =
  config.oidc === undefined ? undefined : createOidcClient({ ...config.oidc, redirectUri: `${config.appUrl}/api/auth/idp/callback` });

// 追加（第6部）: 期限の切れた冪等キーを、1時間ごとに消す。unref() で、このタイマーのためにプロセスを残さない
// 追加（第10部）: 期限の切れたセッションとメールのトークンも消す
const purgeTimer = setInterval(() => {
  idempotencyStore.purgeExpired().catch((err: unknown) => logger.error({ err }, '冪等キーを消せませんでした'));
  sessionStore.purgeExpired().catch((err: unknown) => logger.error({ err }, 'セッションを消せませんでした'));
  users.purgeExpiredTokens().catch((err: unknown) => logger.error({ err }, 'メールのトークンを消せませんでした'));
}, 60 * 60 * 1000).unref();

/** 変更（第10部）: ログインしている人のためのサービス。データの層も、イベントを配るハブも、その人のもの */
function serviceFor(req: Request) {
  const userId = req.user?.id;
  if (userId === undefined) throw new Error('requireUser の後で呼んでください'); // ここに来たら、組み立ての間違い（500）
  return createTaskService({
    repo: createPgTaskRepo(pool, userId), // 変更（第10部）: どの SQL も、この人のタスクだけに絞る
    clock: () => new Date(),
    maxDoing: config.maxDoing,
    publish: (type, task) => hubs.for(userId).publish(type, task), // サービスは hub を知らない。関数だけを渡す
  });
}
const sse = sseRoute(
  (req) => {
    if (req.user === undefined) throw new Error('requireUser の後で呼んでください');
    return hubs.for(req.user.id);
  },
  { heartbeatMs: config.sseHeartbeatMs },
);

let ready = true;
const app = createApp({ serviceFor, sse, logger, config, isReady: () => ready, idempotencyStore, auth, users, sessionStore, oidc });

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

/** 追加（第7部）: リクエストが全部終わった後の片付け。server.close のコールバックは Promise を待たないので、別の関数にする */
async function cleanup(): Promise<void> {
  // 追加（第6部）: リクエストが全部終わってから、プールの接続を閉じる（閉じないと、プロセスが終わらない）
  clearInterval(purgeTimer);
  await pool.end();
  logger.info('stopped');
  process.exitCode = 0;
}

let stopping = false;
function shutdown(signal: NodeJS.Signals): void {
  if (stopping) return;
  stopping = true;
  ready = false;
  logger.info({ signal, sse: sse.size() }, 'shutting down');

  // 時間内に終わらなければ、あきらめて終了コード 1。unref() で、このタイマーのためにプロセスを残さない
  setTimeout(() => {
    logger.error({ timeoutMs: config.shutdownTimeoutMs }, '時間内に終わらなかったので終了します');
    process.exit(1);
  }, config.shutdownDelayMs + config.shutdownTimeoutMs).unref();

  setTimeout(() => {
    // 追加（成果物）: SSE の応答は終わらないので、先に閉じる。閉じないと server.close() が時間切れまで待つ（第27章 5節）
    sse.closeAll();
    server.close(() => {
      // 変更（第7部）: 失敗したら、ログに書いて終了コード 1（ESLint の no-misused-promises: async の関数を渡さない）
      cleanup().catch((err: unknown) => {
        logger.error({ err }, '止めるときにエラーが起きました');
        process.exitCode = 1;
      });
    });
  }, config.shutdownDelayMs);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
