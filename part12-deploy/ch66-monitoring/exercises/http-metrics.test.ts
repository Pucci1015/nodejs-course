// 練習問題6 のテスト（Express のアプリを空いているポートで動かし、fetch で頼む）
// 使い方: node --test http-metrics.test.ts
//   模範解答を試す: MODULE=../solutions/http-metrics.ts node --test http-metrics.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './http-metrics.ts');
const { createHttpMetrics }: typeof import('./http-metrics.ts') = await import(pathToFileURL(file).href);

/** 偽の時計: 呼ばれるたびに、決めた値を順に返す（頼みの始めと終わりで 1 回ずつ呼ばれる） */
function fakeClock(values: number[]) {
  let i = 0;
  return () => values[i++] ?? 0;
}

async function withApp(metrics: ReturnType<typeof createHttpMetrics>, fn: (base: string) => Promise<void>) {
  const app = express();
  app.use(metrics.middleware);
  const tasks = express.Router();
  tasks.get('/:id', (req, res) => {
    res.json({ id: req.params.id });
  });
  app.use('/api/tasks', tasks);
  app.get('/fast', (_req, res) => {
    res.send('ok');
  });
  app.get('/boom', () => {
    throw new Error('わざと');
  });
  app.use((_req: express.Request, res: express.Response) => {
    res.status(404).send('なし');
  });
  app.use((_err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).send('エラー');
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  try {
    await fn(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    server.close();
  }
}

const get = async (url: string) => (await fetch(url, { signal: AbortSignal.timeout(3000) })).text();
const finished = () => new Promise((r) => setTimeout(r, 20)); // finish のイベントを待つ

test('method・route・status ごとに数える', async () => {
  const m = createHttpMetrics();
  await withApp(m, async (base) => {
    await get(`${base}/fast`);
    await get(`${base}/fast`);
    await get(`${base}/boom`);
    await finished();
  });
  const text = m.render();
  assert.match(text, /^http_requests_total\{method="GET",route="\/fast",status="200"\} 2$/m);
  assert.match(text, /^http_requests_total\{method="GET",route="\/boom",status="500"\} 1$/m);
});

test('ルーターの下は baseUrl を足したルートの形（/api/tasks/:id）。id ごとに分けない', async () => {
  const m = createHttpMetrics();
  await withApp(m, async (base) => {
    for (const id of ['1', '2', '3']) await get(`${base}/api/tasks/${id}`);
    await finished();
  });
  const text = m.render();
  assert.match(text, /^http_requests_total\{method="GET",route="\/api\/tasks\/:id",status="200"\} 3$/m);
  assert.doesNotMatch(text, /tasks\/1/);
});

test('どのルートにも合わない頼みは unmatched（URL を書かない）', async () => {
  const m = createHttpMetrics();
  await withApp(m, async (base) => {
    await get(`${base}/no/such/page-123`);
    await finished();
  });
  const text = m.render();
  assert.match(text, /^http_requests_total\{method="GET",route="unmatched",status="404"\} 1$/m);
  assert.doesNotMatch(text, /page-123/);
});

test('TYPE の行がある', async () => {
  const m = createHttpMetrics();
  assert.match(m.render(), /^# TYPE http_requests_total counter$/m);
  assert.match(m.render(), /^# TYPE http_request_duration_seconds histogram$/m);
});

test('かかった時間を、ルートごとのヒストグラムに（le は 0.01・0.05・0.1・0.5・1・+Inf、累積）', async () => {
  // 1 つ目 30ms、2 つ目 300ms、3 つ目 3 秒
  const m = createHttpMetrics({ now: fakeClock([0, 30, 1000, 1300, 2000, 5000]) });
  await withApp(m, async (base) => {
    await get(`${base}/fast`);
    await finished();
    await get(`${base}/fast`);
    await finished();
    await get(`${base}/fast`);
    await finished();
  });
  const text = m.render();
  const bucket = (le: string) => new RegExp(`^http_request_duration_seconds_bucket\\{route="/fast",le="${le}"\\} (\\d+)$`, 'm').exec(text)?.[1];
  assert.deepEqual(['0.01', '0.05', '0.1', '0.5', '1', '\\+Inf'].map(bucket), ['0', '1', '1', '2', '2', '3']);
  assert.match(text, /^http_request_duration_seconds_count\{route="\/fast"\} 3$/m);
  const sum = Number(/^http_request_duration_seconds_sum\{route="\/fast"\} (\S+)$/m.exec(text)?.[1]);
  assert.ok(Math.abs(sum - 3.33) < 1e-9, String(sum));
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
