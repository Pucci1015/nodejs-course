// 起動（コンポジションルート。第26章 4節）: loadConfig → logger → repo → hub → service → app → listen → shutdown
// 第26章 練習問題9の模範解答（ch26-app-structure/solutions/server.mjs）から始めて、組み立てと SSE の片付けを足した
import pino from 'pino';
import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';
import { createEventHub, sseRoute } from './lib/event-hub.mjs';
import { createMemoryTaskRepo } from './repositories/memory-tasks.mjs';
import { createTaskService } from './services/tasks.mjs';

// 設定は起動するときに1回だけ確かめる。間違っていたら、理由（名前だけ）を書いて終了コード 1
let config;
try {
  config = loadConfig(process.env);
} catch (e) {
  console.error(JSON.stringify({ level: 60, msg: e.message })); // ロガーを作る前なので、同じ形の JSON を自分で書く
  process.exit(1);
}

// ログは1行1つの JSON。秘密のヘッダは書く前に隠す
const logger = pino({ level: config.logLevel, redact: { paths: ['req.headers.authorization', 'req.headers.cookie'], censor: '[redacted]' } });

// 組み立て。ここだけが「どの実物を使うか」を知っている（第6部では、repo を PostgreSQL のものに替える）
const hub = createEventHub({ bufferSize: 100 });
const repo = createMemoryTaskRepo();
const service = createTaskService({
  repo,
  clock: () => new Date(),
  maxDoing: config.maxDoing,
  publish: (type, task) => hub.publish(type, task), // サービスは hub を知らない。関数だけを渡す
});
const sse = sseRoute(hub, { heartbeatMs: config.sseHeartbeatMs });

let ready = true;
const app = createApp({ service, sse, logger, config, isReady: () => ready });

const server = app.listen(config.port, config.host, () => {
  const { port } = server.address();
  logger.info({ url: `http://${config.host}:${port}` }, 'listening');
});
// 起動の失敗（ポートが使われている、など）もログに書いて、終了コード 1
server.on('error', (err) => {
  logger.fatal({ err }, '起動できませんでした');
  process.exit(1);
});

let stopping = false;
function shutdown(signal) {
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
      logger.info('stopped');
      process.exitCode = 0;
    });
  }, config.shutdownDelayMs);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
