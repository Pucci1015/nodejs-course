// 練習問題7 のテスト（データベースは使わず、取る・処理する関数を偽物にする）
// 使い方: node --test run-worker.test.ts
//   模範解答を試す: MODULE=../solutions/run-worker.ts node --test run-worker.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './run-worker.ts');
const { runWorker }: typeof import('./run-worker.ts') = await import(pathToFileURL(file).href);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 仕事の列の偽物。log に、起きたことを順に書く */
function fakeQueue(items: number[]) {
  const log: string[] = [];
  return {
    log,
    claim: async () => {
      const j = items.shift();
      if (j !== undefined) log.push(`claim ${j}`);
      return j;
    },
    complete: async (j: number) => void log.push(`complete ${j}`),
    fail: async (j: number, err: unknown) => void log.push(`fail ${j}: ${err instanceof Error ? err.message : String(err)}`),
  };
}

test('仕事を順に処理して、止める合図の後で、数を返す', async () => {
  const q = fakeQueue([1, 2, 3]);
  const ac = new AbortController();
  const p = runWorker({ ...q, handle: async () => {}, idleMs: 20, signal: ac.signal });
  await sleep(100);
  ac.abort();
  assert.deepEqual(await p, { completed: 3, failed: 0 });
  assert.deepEqual(q.log, ['claim 1', 'complete 1', 'claim 2', 'complete 2', 'claim 3', 'complete 3']);
});

test('handle が失敗したら fail を呼び、次の仕事へ進む（ループは止まらない）', async () => {
  const q = fakeQueue([1, 2]);
  const ac = new AbortController();
  const p = runWorker({
    ...q,
    handle: async (j) => {
      if (j === 1) throw new Error('だめ');
    },
    idleMs: 20,
    signal: ac.signal,
  });
  await sleep(100);
  ac.abort();
  assert.deepEqual(await p, { completed: 1, failed: 1 });
  assert.deepEqual(q.log, ['claim 1', 'fail 1: だめ', 'claim 2', 'complete 2']);
});

test('処理中に止める合図が来ても、その仕事は最後まで終えてから止まる（次は取らない）', async () => {
  const q = fakeQueue([1, 2]);
  const ac = new AbortController();
  const p = runWorker({ ...q, handle: async () => { await sleep(200); }, idleMs: 20, signal: ac.signal });
  await sleep(50);
  ac.abort();
  assert.deepEqual(await p, { completed: 1, failed: 0 });
  assert.deepEqual(q.log, ['claim 1', 'complete 1']);
});

test('仕事が無いときは idleMs 待って聞き直す。待っている間に止める合図が来たら、すぐ止まる', async () => {
  let claims = 0;
  const ac = new AbortController();
  const started = Date.now();
  const p = runWorker({
    claim: async () => {
      claims += 1;
      return undefined;
    },
    handle: async () => {},
    complete: async () => {},
    fail: async () => {},
    idleMs: 1000,
    signal: ac.signal,
  });
  await sleep(50);
  ac.abort();
  assert.deepEqual(await p, { completed: 0, failed: 0 });
  assert.equal(claims, 1);
  assert.ok(Date.now() - started < 500, '待ち時間の終わりを待たずに止まる');
});

test('初めから止める合図が出ていたら、何も取らない', async () => {
  const q = fakeQueue([1]);
  assert.deepEqual(await runWorker({ ...q, handle: async () => {}, idleMs: 10, signal: AbortSignal.abort() }), {
    completed: 0,
    failed: 0,
  });
  assert.deepEqual(q.log, []);
});

test('claim そのものが失敗したら（データベースが止まった）、idleMs 待って続ける', async () => {
  let n = 0;
  const done: number[] = [];
  const ac = new AbortController();
  const p = runWorker({
    claim: async () => {
      n += 1;
      if (n === 1) throw new Error('つながりません');
      return n === 2 ? 7 : undefined;
    },
    handle: async () => {},
    complete: async (j: number) => void done.push(j),
    fail: async () => {},
    idleMs: 20,
    signal: ac.signal,
  });
  await sleep(100);
  ac.abort();
  assert.deepEqual(await p, { completed: 1, failed: 0 });
  assert.deepEqual(done, [7]);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
