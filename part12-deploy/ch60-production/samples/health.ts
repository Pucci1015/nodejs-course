// 第60章 8.1節: /healthz（プロセスが動いているか）と /readyz（頼みを受けられるか。データベースに届くか）
// 動かし方（章のフォルダで）: node samples/health.ts
//   DATABASE_URL を変えると、届かないデータベースを試せる:
//   DATABASE_URL=postgres://app:dev-only-password@127.0.0.1:5999/taskapi node samples/health.ts
import express from 'express';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5433/taskapi',
  connectionTimeoutMillis: 1000, // つなぐのに 1 秒より長くかかったらあきらめる
});
pool.on('error', () => {}); // 使っていない接続が切れても、プロセスを落とさない（第6部 第32章）

/** promise が ms ミリ秒で終わらなければ、失敗にする */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error(`${ms} ms で終わりませんでした`)), ms).unref()),
  ]);
}

let stopping = false;
const app = express();
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' }); // ここではデータベースを見ない（見ると、DB が止まっただけでアプリまで起動し直される）
});
app.get('/readyz', async (_req, res) => {
  if (stopping) {
    res.status(503).json({ status: 'stopping' });
    return;
  }
  try {
    await withTimeout(pool.query('SELECT 1'), 1500);
    res.json({ status: 'ok', db: 'ok' });
  } catch (err) {
    // 理由はログに書き、応答には書かない（つなぎ先の名前やポートを外に見せない。第10部 第55章 10節）
    console.error('readyz: データベースに届きません:', err instanceof Error ? err.message : err);
    res.status(503).json({ status: 'error', db: 'error' });
  }
});

const server = app.listen(9807, '127.0.0.1', () => console.log('http://127.0.0.1:9807/healthz・/readyz で待っています'));
process.on('SIGTERM', () => {
  stopping = true; // まず /readyz を 503 にして、ロードバランサに「もう送らないで」と伝える
  setTimeout(() => server.close(() => void pool.end()), 2000);
});
