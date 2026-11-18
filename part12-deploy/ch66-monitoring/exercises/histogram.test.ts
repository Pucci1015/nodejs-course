// 練習問題5 のテスト
// 使い方: node --test histogram.test.ts
//   模範解答を試す: MODULE=../solutions/histogram.ts node --test histogram.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './histogram.ts');
const { Histogram }: typeof import('./histogram.ts') = await import(pathToFileURL(file).href);

const B = [0.01, 0.05, 0.1, 0.5, 1];

test('snapshot: バケツは累積（その区切り以下の数）。最後は Infinity', () => {
  const h = new Histogram(B);
  for (const v of [0.005, 0.01, 0.03, 0.2, 2]) h.observe(v);
  const s = h.snapshot();
  assert.deepEqual(s.buckets, [
    { le: 0.01, count: 2 },
    { le: 0.05, count: 3 },
    { le: 0.1, count: 3 },
    { le: 0.5, count: 4 },
    { le: 1, count: 4 },
    { le: Infinity, count: 5 },
  ]);
  assert.equal(s.count, 5);
  assert.ok(Math.abs(s.sum - 2.245) < 1e-9);
});

test('区切りちょうどの値は、その区切りのバケツに入る（以下）', () => {
  const h = new Histogram(B);
  h.observe(0.05);
  assert.equal(h.snapshot().buckets[1]?.count, 1);
  assert.equal(h.snapshot().buckets[0]?.count, 0);
});

test('quantile: バケツの中は一様として、比で求める', () => {
  const h = new Histogram([0.1, 0.2]);
  for (let i = 0; i < 10; i += 1) h.observe(0.15); // 10 個とも 0.1〜0.2 のバケツ
  assert.ok(Math.abs(h.quantile(0.5) - 0.15) < 1e-9);
  assert.ok(Math.abs(h.quantile(0.9) - 0.19) < 1e-9);
});

test('quantile: 最初のバケツは 0 から数える', () => {
  const h = new Histogram([0.1, 0.2]);
  for (let i = 0; i < 4; i += 1) h.observe(0.05);
  assert.ok(Math.abs(h.quantile(0.5) - 0.05) < 1e-9);
});

test('quantile: いくつかのバケツにまたがる', () => {
  const h = new Histogram([0.1, 0.5, 1]);
  for (let i = 0; i < 90; i += 1) h.observe(0.05);
  for (let i = 0; i < 10; i += 1) h.observe(0.3);
  // 95 番目は 0.1〜0.5 のバケツの 5/10 の所
  assert.ok(Math.abs(h.quantile(0.95) - 0.3) < 1e-9);
  assert.ok(Math.abs(h.quantile(0.5) - 0.1 * (50 / 90)) < 1e-9);
});

test('quantile: +Inf のバケツに入ったら、いちばん大きい区切り。数が 0 なら NaN', () => {
  const h = new Histogram([0.1, 1]);
  h.observe(5);
  assert.equal(h.quantile(0.99), 1);
  assert.ok(Number.isNaN(new Histogram([1]).quantile(0.5)));
  assert.throws(() => h.quantile(1.5), /q/);
});

test('buckets が空・並んでいない・重なると例外。NaN は数えない', () => {
  assert.throws(() => new Histogram([]), /buckets/);
  assert.throws(() => new Histogram([0.5, 0.1]), /buckets/);
  assert.throws(() => new Histogram([0.1, 0.1]), /buckets/);
  const h = new Histogram([1]);
  h.observe(Number.NaN);
  assert.equal(h.snapshot().count, 0);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
