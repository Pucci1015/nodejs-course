// 練習問題5 のテスト
// 使い方: node --test health.test.ts
//   模範解答を試す: MODULE=../solutions/health.ts node --test health.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './health.ts');
const { createHealthRouter }: typeof import('./health.ts') = await import(pathToFileURL(file).href);

/** ルーターを付けたアプリを空いているポートで起動し、path を GET して、状態・ヘッダ・本文と、かかった時間を返す */
async function get(options: Parameters<typeof createHealthRouter>[0], urlPath: string) {
  const app = express();
  app.use(createHealthRouter(options));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  try {
    const started = performance.now();
    const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, { signal: AbortSignal.timeout(5000) });
    const body: unknown = await res.json();
    return { status: res.status, cacheControl: res.headers.get('cache-control'), body, ms: performance.now() - started };
  } finally {
    server.close();
  }
}

const ok = async () => {};
const fail = async () => {
  throw new Error('connect ECONNREFUSED 10.0.0.5:5432');
};
const hang = () => new Promise<never>(() => {});
const base = { timeoutMs: 200, isStopping: () => false };

test('/healthz は、確かめをせずに 200 と {status: ok}（no-store）', async () => {
  let called = false;
  const r = await get({ ...base, checks: { db: async () => void (called = true) } }, '/healthz');
  assert.deepEqual([r.status, r.cacheControl, r.body], [200, 'no-store', { status: 'ok' }]);
  assert.equal(called, false);
});

test('/readyz: 全部 ok なら 200 と、名前ごとの結果', async () => {
  const r = await get({ ...base, checks: { db: ok, redis: ok } }, '/readyz');
  assert.deepEqual([r.status, r.cacheControl, r.body], [200, 'no-store', { status: 'ok', checks: { db: 'ok', redis: 'ok' } }]);
});

test('/readyz: 1つでも失敗なら 503。理由（中の住所）は応答に書かない', async () => {
  const r = await get({ ...base, checks: { db: fail, redis: ok } }, '/readyz');
  assert.deepEqual([r.status, r.body], [503, { status: 'error', checks: { db: 'error', redis: 'ok' } }]);
  assert.doesNotMatch(JSON.stringify(r.body), /10\.0\.0\.5|ECONNREFUSED/);
});

test('/readyz: 終わらない確かめは timeoutMs で打ち切って error', async () => {
  const r = await get({ ...base, checks: { db: hang, redis: ok } }, '/readyz');
  assert.deepEqual([r.status, r.body], [503, { status: 'error', checks: { db: 'error', redis: 'ok' } }]);
  assert.ok(r.ms < 1000, `${Math.round(r.ms)} ms かかりました`);
});

test('/readyz: 確かめは同時に動かす（200 ms × 3 でも、待つのは約 200 ms）', async () => {
  const slow = () => new Promise((resolve) => setTimeout(resolve, 150));
  const r = await get({ ...base, timeoutMs: 1000, checks: { a: slow, b: slow, c: slow } }, '/readyz');
  assert.equal(r.status, 200);
  assert.ok(r.ms < 400, `${Math.round(r.ms)} ms かかりました`);
});

test('/readyz: 止めている途中なら、確かめずに 503 と {status: stopping}', async () => {
  let called = false;
  const r = await get({ ...base, isStopping: () => true, checks: { db: async () => void (called = true) } }, '/readyz');
  assert.deepEqual([r.status, r.body], [503, { status: 'stopping' }]);
  assert.equal(called, false);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
