// 第61章でコンテナにする、小さな API
// 動かし方: node src/server.ts（このフォルダで）
// 環境変数: HOST（既定 127.0.0.1。コンテナの中では 0.0.0.0）、PORT（既定 9817）、APP_VERSION
//   DATABASE_URL・REDIS_URL（あれば、/readyz で届くかを確かめる）
import os from 'node:os';
import express from 'express';
import pg from 'pg';
import { createClient } from 'redis';

const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 9817);
const pool = process.env.DATABASE_URL === undefined ? undefined : new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 1000 });
pool?.on('error', () => {});
const redis = process.env.REDIS_URL === undefined ? undefined : createClient({ url: process.env.REDIS_URL });
redis?.on('error', () => {}); // つながらない間のエラーで、プロセスを落とさない（第6部 第34章）
void redis?.connect().catch(() => {}); // 待たない（届かなくても、起動はする。/readyz が 503 になる）

let stopping = false;
const app = express();
app.get('/', (_req, res) => {
  res.json({
    message: 'こんにちは、コンテナから',
    version: process.env.APP_VERSION ?? 'dev',
    node: process.version,
    arch: process.arch, // CPU の種類（arm64・x64）
    hostname: os.hostname(), // コンテナの中では、コンテナの ID の頭
    user: os.userInfo().username,
    pid: process.pid,
    env: process.env.NODE_ENV ?? '(なし)',
  });
});
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});
app.get('/readyz', async (_req, res) => {
  if (stopping) {
    res.status(503).json({ status: 'stopping' });
    return;
  }
  const checks: Record<string, string> = {};
  if (pool !== undefined) {
    try {
      await pool.query('SELECT 1');
      checks.db = 'ok';
    } catch (err) {
      console.error('readyz: db:', err instanceof Error ? err.message : err);
      checks.db = 'error';
    }
  }
  if (redis !== undefined) {
    try {
      if (!redis.isReady) throw new Error('つながっていません');
      await redis.ping();
      checks.redis = 'ok';
    } catch (err) {
      console.error('readyz: redis:', err instanceof Error ? err.message : err);
      checks.redis = 'error';
    }
  }
  const ok = Object.values(checks).every((v) => v === 'ok');
  res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'error', ...checks });
});

const server = app.listen(port, host, () => {
  console.log(`pid ${process.pid}: http://${host}:${port}/ で待っています`);
});

function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  console.log(`${signal} を受け取りました。止めます`);
  server.close(() => {
    void Promise.allSettled([pool?.end(), redis?.close()]).finally(() => console.log('止まりました'));
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
