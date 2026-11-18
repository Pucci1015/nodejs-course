// 練習問題7 のテスト（時計は偽物）
// 使い方: node --test target-pool.test.ts
//   模範解答を試す: MODULE=../solutions/target-pool.ts node --test target-pool.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './target-pool.ts');
const { createTargetPool }: typeof import('./target-pool.ts') = await import(pathToFileURL(file).href);

function clock() {
  let t = 0;
  return { now: () => t, advance: (ms: number) => void (t += ms) };
}
const picks = (pool: { pick(): string | undefined }, n: number) => Array.from({ length: n }, () => pool.pick());

test('順番に配る（ラウンドロビン）', () => {
  const pool = createTargetPool(['a', 'b', 'c'], { failThreshold: 3, cooldownMs: 1000 });
  assert.deepEqual(picks(pool, 7), ['a', 'b', 'c', 'a', 'b', 'c', 'a']);
});

test('続けて failThreshold 回失敗した台は、cooldownMs の間、配らない', () => {
  const c = clock();
  const pool = createTargetPool(['a', 'b'], { failThreshold: 2, cooldownMs: 1000, now: c.now });
  pool.reportFailure('b');
  assert.deepEqual(picks(pool, 2), ['a', 'b'], '1 回の失敗では休ませない');
  pool.reportFailure('b');
  assert.deepEqual(picks(pool, 3), ['a', 'a', 'a']);
  assert.deepEqual(pool.status().map((s) => s.up), [true, false]);
});

test('成功すると、続けての失敗を数え直す', () => {
  const pool = createTargetPool(['a', 'b'], { failThreshold: 2, cooldownMs: 1000 });
  pool.reportFailure('b');
  pool.reportSuccess('b');
  pool.reportFailure('b');
  assert.deepEqual(picks(pool, 2), ['a', 'b']);
  assert.equal(pool.status()[1]?.failures, 1);
});

test('休みが明けたら、また配る。明けた後の 1 回目で失敗したら、すぐまた休ませる', () => {
  const c = clock();
  const pool = createTargetPool(['a', 'b'], { failThreshold: 3, cooldownMs: 1000, now: c.now });
  for (let i = 0; i < 3; i += 1) pool.reportFailure('b');
  c.advance(999);
  assert.deepEqual(picks(pool, 2), ['a', 'a']);
  c.advance(1);
  assert.deepEqual(picks(pool, 2), ['b', 'a']);
  pool.reportFailure('b');
  assert.equal(pool.status()[1]?.up, false, '1 回で休む');
  c.advance(1000);
  pool.reportSuccess('b');
  assert.equal(pool.status()[1]?.failures, 0);
});

test('全部休んでいたら undefined', () => {
  const pool = createTargetPool(['a'], { failThreshold: 1, cooldownMs: 1000 });
  pool.reportFailure('a');
  assert.equal(pool.pick(), undefined);
});

test('知らない台の報告は無視する。空・重なった targets は例外', () => {
  const pool = createTargetPool(['a'], { failThreshold: 1, cooldownMs: 1000 });
  pool.reportFailure('zzz');
  assert.equal(pool.pick(), 'a');
  assert.throws(() => createTargetPool([], { failThreshold: 1, cooldownMs: 1 }), /targets/);
  assert.throws(() => createTargetPool(['a', 'a'], { failThreshold: 1, cooldownMs: 1 }), /targets/);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
