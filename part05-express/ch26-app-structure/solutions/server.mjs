// 練習問題9の模範解答: 設定・ログ・止め方を直したサーバ
// 確かめ方（exercises の中で）: bash check-server.sh ../solutions/server.mjs
import express from 'express';
import pino from 'pino';
import { loadConfig } from './config.mjs'; // 練習問題5
import { requestLogger } from './request-logger.mjs'; // 練習問題7

// 修正: 設定は起動するときに1回だけ確かめる。間違っていたら、理由（名前だけ）を書いて終了コード 1
let config;
try {
  config = loadConfig(process.env);
} catch (e) {
  console.error(JSON.stringify({ level: 60, msg: e.message })); // ロガーを作る前なので、同じ形の JSON を自分で書く
  process.exit(1);
}

// 修正: ログは1行1つの JSON。秘密のヘッダは書く前に隠す
const logger = pino({ level: config.logLevel, redact: { paths: ['req.headers.authorization', 'req.headers.cookie'], censor: '[redacted]' } });

let ready = true;
const app = express();
app.disable('x-powered-by');
app.use(requestLogger({ logger })); // 修正: 応答の後に、ステータスつきで1行

app.get('/healthz', (req, res) => res.json({ status: 'ok' }));
// 修正: 止める途中は 503（ロードバランサに「もう送らないで」と知らせる）
app.get('/readyz', (req, res) => (ready ? res.json({ status: 'ready' }) : res.status(503).json({ status: 'shutting_down' })));
app.get('/api/me', (req, res) => res.json({ loggedIn: req.get('authorization') !== undefined, secretLength: config.sessionSecret?.length ?? 0 }));
app.get('/slow', async (req, res) => {
  await new Promise((r) => setTimeout(r, 1500));
  res.json({ done: true });
});
app.get('/hang', () => {});

const server = app.listen(config.port, config.host, () => {
  logger.info({ port: server.address().port }, 'listening');
});
// 追加: 起動の失敗（ポートが使われている、など）もログに書いて、終了コード 1
server.on('error', (err) => {
  logger.fatal({ err }, '起動できませんでした');
  process.exit(1);
});

let stopping = false;
function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  ready = false;
  logger.info({ signal }, 'shutting down');

  // 追加: 時間内に終わらなければ、あきらめて終了コード 1。unref() で、このタイマーのためにプロセスを残さない
  setTimeout(() => {
    logger.error({ timeoutMs: config.shutdownTimeoutMs }, '時間内に終わらなかったので終了します');
    process.exit(1);
  }, config.shutdownDelayMs + config.shutdownTimeoutMs).unref();

  // 修正: すぐに process.exit() しない。新しい接続を断り、今のリクエストが終わるのを待つ
  setTimeout(() => {
    server.close(() => {
      logger.info('stopped');
      process.exitCode = 0;
    });
  }, config.shutdownDelayMs);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
