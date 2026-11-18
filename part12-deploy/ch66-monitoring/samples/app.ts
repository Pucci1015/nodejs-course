// 第66章 2〜6節: 見張れるようにしたアプリ。構造化ログ・errorId・/metrics・イベントループの遅れ
// 動かし方（章のフォルダで）: node samples/app.ts            → http://127.0.0.1:9867/
//   PORT=9868 NAME=b node samples/app.ts で、2 台目（7 節）
//   PRIMES=sieve で、/cpu を速い数え方にする（5.2 節）
import crypto from 'node:crypto';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
import express from 'express';
import pino from 'pino';
import { createClient } from 'redis';
import { Counter, Gauge, Histogram } from './metrics.ts';

const PORT = Number(process.env.PORT ?? 9867);
const NAME = process.env.NAME ?? 'a';
const logger = pino({ base: { app: 'ch66', instance: NAME } });

// --- 数えるもの ---
const requests = new Counter('http_requests_total', 'リクエストの数');
const duration = new Histogram('http_request_duration_seconds', 'リクエストにかかった秒数', [0.01, 0.05, 0.1, 0.25, 0.5, 1]);
const loop = monitorEventLoopDelay({ resolution: 10 });
loop.enable();
const lag = new Gauge('nodejs_eventloop_lag_p99_seconds', '前に聞かれてからの、イベントループの遅れの 99 パーセンタイル（秒）', () => {
  const p99 = loop.percentile(99) / 1e9; // ナノ秒 → 秒
  loop.reset(); // 次は、ここから数え直す
  return p99;
});
const heap = new Gauge('nodejs_heap_used_bytes', '使っているヒープ', () => process.memoryUsage().heapUsed);

const app = express();
app.disable('x-powered-by');

// リクエストごとに id を付け、終わったら 1 行のログと、数を残す
app.use((req, res, next) => {
  const start = performance.now();
  const reqId = crypto.randomUUID();
  res.setHeader('X-Request-Id', reqId);
  res.setHeader('X-Served-By', NAME);
  res.once('finish', () => {
    const seconds = (performance.now() - start) / 1000;
    const r: unknown = req.route; // ルートが決まったときだけある（Express の型では any なので unknown で受ける）
    const route = typeof r === 'object' && r !== null && 'path' in r && typeof r.path === 'string' ? r.path : 'unmatched'; // URL ではなくルートの形で数える
    requests.inc({ method: req.method, route, status: String(res.statusCode) });
    duration.observe(seconds);
    logger.info({ reqId, method: req.method, url: req.originalUrl, status: res.statusCode, ms: Math.round(seconds * 1000) }, 'request');
  });
  next();
});

app.get('/fast', (_req, res) => {
  res.json({ ok: true });
});

app.get('/io', async (_req, res) => {
  await sleep(50); // データベースや外の API を待つつもり（その間、ほかの頼みを受けられる）
  res.json({ ok: true });
});

/** わざと遅い計算（素数を数える）。この間、イベントループは止まる */
function countPrimes(limit: number): number {
  let count = 0;
  for (let n = 2; n <= limit; n += 1) {
    let prime = true;
    for (let d = 2; d * d <= n; d += 1) {
      if (n % d === 0) {
        prime = false;
        break;
      }
    }
    if (prime) count += 1;
  }
  return count;
}

/** 同じ数を、エラトステネスのふるいで数える（5.2 節で直した版） */
function countPrimesSieve(limit: number): number {
  const composite = new Uint8Array(limit + 1); // 0 なら素数の候補
  let count = 0;
  for (let n = 2; n <= limit; n += 1) {
    if (composite[n] === 1) continue;
    count += 1;
    for (let m = n * n; m <= limit; m += n) composite[m] = 1; // n の倍数に印を付ける
  }
  return count;
}

app.get('/cpu', (_req, res) => {
  const count = process.env.PRIMES === 'sieve' ? countPrimesSieve : countPrimes;
  res.json({ primes: count(300_000) });
});

app.get('/boom', () => {
  throw new Error('データベースにつながりません（わざと）');
});

app.get('/metrics', (_req, res) => {
  res.type('text/plain; version=0.0.4').send([requests, duration, lag, heap].map((m) => m.render()).join('\n') + '\n');
});

// 7 節: 訪問の数。メモリに数えると、台ごとに別々の数になる。Redis に数えると、全部の台で 1 つの数になる
let visits = 0;
const connectRedis = () => createClient({ url: process.env.REDIS_URL ?? 'redis://127.0.0.1:6380' }).connect();
let redis: Awaited<ReturnType<typeof connectRedis>> | undefined;
app.get('/visits', async (req, res) => {
  if (req.query.shared === '1') {
    redis ??= await connectRedis();
    res.json({ instance: NAME, visits: await redis.incr('ch66:visits') });
    return;
  }
  visits += 1;
  res.json({ instance: NAME, visits });
});

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, instance: NAME });
});

// 500 は、中身を見せずに errorId を返し、ログには詳しく書く（第10部 第55章）
app.use((_req, res) => {
  res.status(404).json({ title: 'Not Found' });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const errorId = crypto.randomUUID();
  logger.error({ reqId: res.getHeader('X-Request-Id'), errorId, err }, 'unhandled error');
  res.status(500).json({ title: 'サーバの中でエラーが起きました', errorId });
});

const server = app.listen(PORT, '127.0.0.1', () => {
  logger.info({ port: PORT }, '起動しました');
});

function stop() {
  server.close(() => {
    void (redis?.close() ?? Promise.resolve()).finally(() => process.exit(0));
  });
}
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
