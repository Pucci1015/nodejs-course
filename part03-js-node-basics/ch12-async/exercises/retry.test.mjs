// 練習問題4 用: retry.mjs の retry のテスト
// 使い方: node --test retry.test.mjs
//   模範解答を試す: MODULE=../solutions/retry.mjs node --test retry.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './retry.mjs');
const { retry } = await import(pathToFileURL(modulePath).href);

/** はじめの failTimes 回は失敗し、その後は成功する fn を作る */
function flaky(failTimes, value = 'ok') {
  const calls = [];
  const fn = async ({ attempt, signal }) => {
    calls.push(attempt);
    assert.ok(signal instanceof AbortSignal, 'fn には AbortSignal が渡される');
    if (calls.length <= failTimes) throw new Error(`失敗 ${calls.length}`);
    return value;
  };
  return { fn, calls };
}

test('1回目で成功したら、その値を返し、やり直さない', async () => {
  const { fn, calls } = flaky(0, 42);
  assert.equal(await retry(fn, { baseMs: 1 }), 42);
  assert.deepEqual(calls, [1]);
});

test('失敗しても、retries 回までやり直す。attempt は 1 から数える', async () => {
  const { fn, calls } = flaky(2);
  assert.equal(await retry(fn, { retries: 3, baseMs: 1 }), 'ok');
  assert.deepEqual(calls, [1, 2, 3]);
});

test('やり直しても失敗し続けたら、最後の失敗で rejected になる', async () => {
  const { fn, calls } = flaky(10);
  await assert.rejects(retry(fn, { retries: 2, baseMs: 1 }), { message: '失敗 3' });
  assert.deepEqual(calls, [1, 2, 3], '最初の1回 + やり直し2回');
});

test('retries: 0 なら、やり直さない', async () => {
  const { fn, calls } = flaky(1);
  await assert.rejects(retry(fn, { retries: 0, baseMs: 1 }), { message: '失敗 1' });
  assert.deepEqual(calls, [1]);
});

test('待つ時間は baseMs × factor^(n-1) で増え、maxMs で頭打ちになる', async () => {
  const delays = [];
  const { fn } = flaky(5);
  await retry(fn, {
    retries: 5,
    baseMs: 2,
    factor: 3,
    maxMs: 30,
    onRetry: ({ delay }) => delays.push(delay),
  });
  assert.deepEqual(delays, [2, 6, 18, 30, 30]);
});

test('onRetry には、次の attempt・待つ時間・直前の失敗が渡される', async () => {
  const infos = [];
  const { fn } = flaky(2);
  await retry(fn, { baseMs: 1, onRetry: (info) => infos.push(info) });
  assert.deepEqual(
    infos.map(({ attempt, delay, error }) => [attempt, delay, error.message]),
    [
      [2, 1, '失敗 1'],
      [3, 2, '失敗 2'],
    ],
  );
});

test('実際に、決めた時間だけ待ってからやり直す', async () => {
  const { fn } = flaky(2);
  const start = performance.now();
  await retry(fn, { baseMs: 40, factor: 2 }); // 40 + 80 = 120ms は待つはず
  const elapsed = performance.now() - start;
  assert.ok(elapsed >= 110, `${elapsed.toFixed(0)}ms しか待っていない`);
});

test('shouldRetry が false を返した失敗は、やり直さずにすぐ rejected になる', async () => {
  const calls = [];
  const fn = async ({ attempt }) => {
    calls.push(attempt);
    const err = new Error(attempt === 1 ? '一時的な失敗' : '404 Not Found');
    err.status = attempt === 1 ? 503 : 404;
    throw err;
  };
  await assert.rejects(
    retry(fn, { retries: 5, baseMs: 1, shouldRetry: (err) => err.status >= 500 }),
    { message: '404 Not Found' },
  );
  assert.deepEqual(calls, [1, 2]);
});

test('timeoutMs を超えた試行は TimeoutError で失敗し、やり直される', async () => {
  const calls = [];
  const fn = async ({ attempt, signal }) => {
    calls.push(attempt);
    // 1回目だけ遅い。signal を渡すと、時間切れで sleep が rejected になる
    await sleep(attempt === 1 ? 1000 : 5, undefined, { signal });
    return `attempt ${attempt}`;
  };
  const start = performance.now();
  assert.equal(await retry(fn, { timeoutMs: 50, baseMs: 1 }), 'attempt 2');
  assert.ok(performance.now() - start < 500, '1回目の 1000ms を待ってはいけない');
  assert.deepEqual(calls, [1, 2]);
});

test('timeoutMs で失敗し続けたら、TimeoutError で rejected になる', async () => {
  const fn = ({ signal }) => sleep(1000, undefined, { signal });
  await assert.rejects(retry(fn, { retries: 1, timeoutMs: 20, baseMs: 1 }), { name: 'TimeoutError' });
});

test('待っている間に signal で中止したら、すぐに signal.reason で rejected になる', async () => {
  const controller = new AbortController();
  const { fn, calls } = flaky(10);
  const start = performance.now();
  const p = retry(fn, { baseMs: 1000, signal: controller.signal });
  setTimeout(() => controller.abort(new Error('ユーザーが中止')), 30);
  await assert.rejects(p, { message: 'ユーザーが中止' });
  assert.ok(performance.now() - start < 500, '1000ms 待ち続けてはいけない');
  assert.deepEqual(calls, [1]);
});

test('試行中に signal で中止したら、fn に渡した signal も中止され、やり直さない', async () => {
  const controller = new AbortController();
  const calls = [];
  const fn = async ({ attempt, signal }) => {
    calls.push(attempt);
    await sleep(1000, undefined, { signal });
  };
  const p = retry(fn, { baseMs: 1, signal: controller.signal });
  setTimeout(() => controller.abort(), 30);
  await assert.rejects(p, { name: 'AbortError' });
  assert.deepEqual(calls, [1]);
});

test('すでに中止された signal なら、fn を1回も呼ばない', async () => {
  const { fn, calls } = flaky(0);
  await assert.rejects(retry(fn, { signal: AbortSignal.abort() }), { name: 'AbortError' });
  assert.deepEqual(calls, []);
});

test('fn が同期で例外を投げても、やり直しの対象になる', async () => {
  let n = 0;
  const fn = () => {
    n++;
    if (n === 1) throw new Error('同期の失敗');
    return 'ok';
  };
  assert.equal(await retry(fn, { baseMs: 1 }), 'ok');
});
