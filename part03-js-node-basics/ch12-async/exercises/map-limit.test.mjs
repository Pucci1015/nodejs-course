// 練習問題3 用: map-limit.mjs の mapLimit のテスト
// 使い方: node --test map-limit.test.mjs
//   模範解答を試す: MODULE=../solutions/map-limit.mjs node --test map-limit.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './map-limit.mjs');
const { mapLimit } = await import(pathToFileURL(modulePath).href);

/** 同時にいくつ動いているかを数える fn を作る */
function tracker() {
  const state = { running: 0, max: 0, started: [] };
  const fn = async (ms, index) => {
    state.started.push(index);
    state.running++;
    state.max = Math.max(state.max, state.running);
    await sleep(ms);
    state.running--;
    return ms * 10;
  };
  return { state, fn };
}

test('結果は、終わった順ではなく、渡した順に並ぶ', async () => {
  const { fn } = tracker();
  assert.deepEqual(await mapLimit([30, 10, 20], 3, fn), [300, 100, 200]);
});

test('同時に動くのは limit 個まで', async () => {
  const { state, fn } = tracker();
  await mapLimit([20, 20, 20, 20, 20, 20, 20], 3, fn);
  assert.equal(state.max, 3);
  assert.equal(state.running, 0);
});

test('1つ終わったら、すぐ次を始める（3個ずつの「組」で待たない）', async () => {
  const { fn } = tracker();
  const start = performance.now();
  // limit 2: [100, 20, 20, 20, 20] → 100 の間に 20 を4つ終えられるので、全体で約 100ms
  // 「2個ずつ組で待つ」作りだと 100 + 20 + 20 = 約 140ms 以上かかる
  await mapLimit([100, 20, 20, 20, 20], 2, fn);
  const elapsed = performance.now() - start;
  assert.ok(elapsed < 130, `${Math.round(elapsed)}ms かかった（130ms より短いはず）`);
});

test('fn には、要素と位置を渡す', async () => {
  const seen = [];
  await mapLimit(['a', 'b'], 1, async (item, index) => seen.push([item, index]));
  assert.deepEqual(seen, [['a', 0], ['b', 1]]);
});

test('配列でなくても、反復できるもの（Set、ジェネレータ）を受け取れる', async () => {
  function* gen() {
    yield 1;
    yield 2;
  }
  assert.deepEqual(await mapLimit(new Set([1, 2, 3]), 2, async (x) => x * 2), [2, 4, 6]);
  assert.deepEqual(await mapLimit(gen(), 2, async (x) => x + 1), [2, 3]);
});

test('空なら [] を返す', async () => {
  assert.deepEqual(await mapLimit([], 3, async (x) => x), []);
});

test('limit が Infinity なら、全部を同時に始める', async () => {
  const { state, fn } = tracker();
  await mapLimit([10, 10, 10, 10, 10], Infinity, fn);
  assert.equal(state.max, 5);
});

test('limit が 1 以上の整数か Infinity でなければ、RangeError で rejected', async () => {
  for (const bad of [0, -1, 1.5, NaN, '2']) {
    await assert.rejects(mapLimit([1], bad, async (x) => x), RangeError, String(bad));
  }
});

test('1つ失敗したら、その失敗で rejected になり、まだ始めていないものは始めない', async () => {
  const started = [];
  const p = mapLimit([1, 2, 3, 4, 5, 6], 2, async (n) => {
    started.push(n);
    await sleep(n === 2 ? 5 : 30); // 2 は 1 より先に失敗する
    if (n === 2) throw new Error(`${n} で失敗`);
    return n;
  });
  await assert.rejects(p, { message: '2 で失敗' });
  await sleep(50);
  assert.deepEqual(started, [1, 2], '失敗した後に 3 以降を始めていない');
});

test('fn が同期で例外を投げても、rejected になる', async () => {
  await assert.rejects(
    mapLimit([1], 1, () => {
      throw new TypeError('同期の例外');
    }),
    TypeError,
  );
});

test('signal で中止すると、signal.reason で rejected になり、新しいものを始めない', async () => {
  const controller = new AbortController();
  const started = [];
  const p = mapLimit(
    [1, 2, 3, 4, 5],
    2,
    async (n) => {
      started.push(n);
      await sleep(30);
      return n;
    },
    { signal: controller.signal },
  );
  setTimeout(() => controller.abort(new Error('中止')), 10);
  await assert.rejects(p, { message: '中止' });
  await sleep(80);
  assert.deepEqual(started, [1, 2]);
});

test('すでに中止された signal なら、1つも始めない', async () => {
  let calls = 0;
  await assert.rejects(
    mapLimit([1, 2], 1, async () => calls++, { signal: AbortSignal.abort() }),
    { name: 'AbortError' },
  );
  assert.equal(calls, 0);
});
