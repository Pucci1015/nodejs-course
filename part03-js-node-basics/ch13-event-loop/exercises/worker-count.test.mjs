// 練習問題2 用: worker-count.mjs のテスト
// 使い方: node --test worker-count.test.mjs
//   模範解答を試す: MODULE=../solutions/worker-count.mjs node --test worker-count.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './worker-count.mjs');
const { countPrimesInWorker } = await import(pathToFileURL(modulePath).href);

test('Promise を返す', async () => {
  const p = countPrimesInWorker(1, 10);
  assert.ok(p instanceof Promise, 'Promise ではありません（return を忘れていませんか）');
  await p;
});

test('素数の数を返す', async () => {
  assert.equal(await countPrimesInWorker(1, 10), 4);
  assert.equal(await countPrimesInWorker(1, 100), 25);
});

test('2つを同時に動かせる', async () => {
  const [a, b] = await Promise.all([countPrimesInWorker(1, 100), countPrimesInWorker(101, 200)]);
  assert.deepEqual([a, b], [25, 21]);
});

test('計算している間も、メインのスレッドのタイマーが動く', async () => {
  let ticks = 0;
  const timer = setInterval(() => ticks++, 10);
  const start = Date.now();
  const count = await countPrimesInWorker(1, 2_000_000);
  const took = Date.now() - start;
  clearInterval(timer);
  assert.equal(count, 148933);
  const expected = Math.floor(took / 10);
  assert.ok(ticks >= expected / 2, `${took}ms の間に、10ms ごとのタイマーが ${ticks} 回しか動きませんでした（メインのスレッドで計算していませんか）`);
});

test('Worker の中で例外が起きたら、その例外で失敗する', async () => {
  await assert.rejects(countPrimesInWorker(10, 1), { name: 'RangeError', message: '範囲が正しくありません: 10〜1' });
});
