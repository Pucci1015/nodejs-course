// 練習問題1 用: sum-squares.mjs のテスト
// 使い方: node --test sum-squares.test.mjs
//   模範解答を試す: MODULE=../solutions/sum-squares.mjs node --test sum-squares.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './sum-squares.mjs');
const { sumSquares, nextTask, sumSquaresAsync } = await import(pathToFileURL(modulePath).href);

test('nextTask は Promise を返す', async () => {
  const p = nextTask();
  assert.ok(p instanceof Promise, 'Promise ではありません（return を忘れていませんか）');
  await p;
});

test('nextTask を await すると、先に予約した setImmediate が先に動く', async () => {
  let ran = false;
  setImmediate(() => {
    ran = true;
  });
  await nextTask();
  assert.equal(ran, true, '譲れていません（Promise.resolve() ではタスクに順番が回りません）');
});

test('sumSquaresAsync は Promise を返す', async () => {
  const p = sumSquaresAsync(3);
  assert.ok(p instanceof Promise);
  await p;
});

test('sumSquaresAsync は sumSquares と同じ結果を返す', async () => {
  assert.equal(await sumSquaresAsync(3), 14);
  assert.equal(await sumSquaresAsync(0), 0);
  assert.equal(await sumSquaresAsync(100_000, 1000), sumSquares(100_000));
  assert.equal(await sumSquaresAsync(12_345, 1000), sumSquares(12_345)); // chunk で割り切れない数
});

test('sumSquaresAsync の計算の途中で、タイマーが動ける', async () => {
  let finished = false;
  let timerRanBeforeFinish = false;
  setTimeout(() => {
    timerRanBeforeFinish = !finished;
  }, 1);
  await sumSquaresAsync(5_000_000, 10_000);
  finished = true;
  assert.equal(timerRanBeforeFinish, true, 'タイマーが計算の後まで待たされました');
});
