// 練習問題1 のテスト
// 使い方: node --test percentile.test.ts
//   模範解答を試す: MODULE=../solutions/percentile.ts node --test percentile.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './percentile.ts');
const { percentile, summarize }: typeof import('./percentile.ts') = await import(pathToFileURL(file).href);

const oneToHundred = Array.from({ length: 100 }, (_, i) => i + 1);

test('1〜100 の p50 は 50、p95 は 95、p99 は 99、p100 は 100', () => {
  assert.equal(percentile(oneToHundred, 50), 50);
  assert.equal(percentile(oneToHundred, 95), 95);
  assert.equal(percentile(oneToHundred, 99), 99);
  assert.equal(percentile(oneToHundred, 100), 100);
});

test('並んでいなくてよい。元の配列は並べ替えない', () => {
  const v = [30, 10, 20];
  assert.equal(percentile(v, 50), 20);
  assert.deepEqual(v, [30, 10, 20]);
});

test('小さい方から ceil(p% × 個数) 番目（nearest-rank）', () => {
  const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assert.equal(percentile(v, 90), 9);
  assert.equal(percentile(v, 91), 10);
  assert.equal(percentile(v, 0), 1);
  assert.equal(percentile([7], 99), 7);
});

test('1 つだけ遅いと、平均は少し、p99・最大は大きく変わる', () => {
  const v = [...Array.from({ length: 99 }, () => 10), 1000];
  const s = summarize(v);
  assert.equal(s.mean, 19.9);
  assert.equal(s.p50, 10);
  assert.equal(s.p99, 10);
  assert.equal(s.max, 1000);
});

test('summarize: 全部の項目', () => {
  assert.deepEqual(summarize([4, 1, 3, 2]), { count: 4, min: 1, mean: 2.5, p50: 2, p95: 4, p99: 4, max: 4 });
});

test('空の配列、範囲の外の p は例外', () => {
  assert.throws(() => percentile([], 50), /values/);
  assert.throws(() => summarize([]), /values/);
  assert.throws(() => percentile([1], 101), /p/);
  assert.throws(() => percentile([1], -1), /p/);
  assert.throws(() => percentile([1], Number.NaN), /p/);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
