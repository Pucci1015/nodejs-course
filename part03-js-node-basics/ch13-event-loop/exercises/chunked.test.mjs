// 練習問題5 用: chunked.mjs の processInChunks のテスト
// 使い方: node --test chunked.test.mjs
//   模範解答を試す: MODULE=../solutions/chunked.mjs node --test chunked.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './chunked.mjs');
const { processInChunks } = await import(pathToFileURL(modulePath).href);

/** 1回あたり約 ms ミリ秒 CPU を使い、2倍にした値を返す */
const heavy = (ms) => (n) => {
  const end = performance.now() + ms;
  while (performance.now() < end);
  return n * 2;
};

const range = (n) => Array.from({ length: n }, (_, i) => i);

test('すべての要素に fn を適用し、順番どおりの配列を返す', async () => {
  assert.deepEqual(await processInChunks([1, 2, 3], (n) => n * 10), [10, 20, 30]);
});

test('fn には要素と位置を渡す。反復できるもの（Set）も受け取る', async () => {
  assert.deepEqual(await processInChunks(new Set(['a', 'b']), (s, i) => `${i}:${s}`), ['0:a', '1:b']);
});

test('空なら []', async () => {
  assert.deepEqual(await processInChunks([], () => 1), []);
});

test('Promise を返す（呼んだ時点では、まだ1つも処理しない）', async () => {
  let calls = 0;
  const p = processInChunks([1, 2], () => calls++);
  assert.ok(p instanceof Promise);
  assert.equal(calls, 0, '同期のうちに処理を始めてはいけない');
  await p;
  assert.equal(calls, 2);
});

test('処理の途中でも、タイマーが動ける（イベントループを長く止めない）', async () => {
  // 1件 1ms × 300件 = 約 300ms の処理。その間、5ms ごとのタイマーの間隔を測る
  let last = performance.now();
  let maxGap = 0;
  let ticks = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    maxGap = Math.max(maxGap, now - last);
    last = now;
    ticks++;
  }, 5);
  const results = await processInChunks(range(300), heavy(1), { budgetMs: 10 });
  clearInterval(timer);
  assert.equal(results.length, 300);
  assert.equal(results[299], 598);
  assert.ok(ticks >= 10, `タイマーが ${ticks} 回しか動いていない`);
  assert.ok(maxGap < 60, `タイマーの間隔が最大 ${maxGap.toFixed(0)}ms あいた`);
});

test('budgetMs を大きくすると、譲る回数が減る', async () => {
  const countYields = async (budgetMs) => {
    let ticks = 0;
    const count = () => {
      ticks++;
      immediate = setImmediate(count);
    };
    let immediate = setImmediate(count);
    await processInChunks(range(100), heavy(1), { budgetMs });
    clearImmediate(immediate);
    return ticks;
  };
  const small = await countYields(5);
  const large = await countYields(50);
  assert.ok(small > large, `budgetMs 5 で ${small} 回、50 で ${large} 回`);
});

test('fn が例外を投げたら、その例外で rejected になり、残りは処理しない', async () => {
  const seen = [];
  await assert.rejects(
    processInChunks(range(10), (n) => {
      seen.push(n);
      if (n === 3) throw new Error('3 で失敗');
    }),
    { message: '3 で失敗' },
  );
  assert.deepEqual(seen, [0, 1, 2, 3]);
});

test('signal で中止したら、次に譲ったところで止まり、signal.reason で rejected', async () => {
  const controller = new AbortController();
  let calls = 0;
  const p = processInChunks(
    range(1000),
    (n) => {
      calls++;
      return heavy(1)(n);
    },
    { budgetMs: 10, signal: controller.signal },
  );
  setTimeout(() => controller.abort(new Error('中止')), 30);
  await assert.rejects(p, { message: '中止' });
  assert.ok(calls < 200, `中止した後も処理を続けている（${calls} 件）`);
});

test('すでに中止された signal なら、1件も処理しない', async () => {
  let calls = 0;
  await assert.rejects(processInChunks([1, 2], () => calls++, { signal: AbortSignal.abort() }), {
    name: 'AbortError',
  });
  assert.equal(calls, 0);
});
