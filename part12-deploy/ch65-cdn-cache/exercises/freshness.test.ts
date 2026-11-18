// 練習問題3 のテスト
// 使い方: node --test freshness.test.ts
//   模範解答を試す: MODULE=../solutions/freshness.ts node --test freshness.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './freshness.ts');
const { cacheState, ageHeader }: typeof import('./freshness.ts') = await import(pathToFileURL(file).href);

const T0 = Date.UTC(2026, 10, 18, 9, 0, 0);
const info = { storedAt: T0, initialAge: 0, lifetime: 10, swr: 30 };

test('年齢は、覚えてから過ぎた秒（切り捨て）', () => {
  assert.equal(cacheState(info, T0).age, 0);
  assert.equal(cacheState(info, T0 + 999).age, 0);
  assert.equal(cacheState(info, T0 + 3500).age, 3);
});

test('lifetime より前は fresh、ちょうど lifetime からは fresh でない', () => {
  assert.deepEqual(cacheState(info, T0 + 9999), { age: 9, state: 'fresh' });
  assert.deepEqual(cacheState(info, T0 + 10_000), { age: 10, state: 'stale-while-revalidate' });
});

test('lifetime + swr より前は stale-while-revalidate、そこからは stale', () => {
  assert.deepEqual(cacheState(info, T0 + 39_999), { age: 39, state: 'stale-while-revalidate' });
  assert.deepEqual(cacheState(info, T0 + 40_000), { age: 40, state: 'stale' });
});

test('swr が 0 なら、新鮮でなくなったらすぐ stale', () => {
  assert.equal(cacheState({ ...info, swr: 0 }, T0 + 10_000).state, 'stale');
});

test('lifetime が 0（no-cache）なら、いつも確かめる', () => {
  assert.equal(cacheState({ ...info, lifetime: 0, swr: 0 }, T0).state, 'stale');
});

test('オリジンの Age を足す（オリジンの手前で、もう 8 秒たっていた）', () => {
  assert.deepEqual(cacheState({ ...info, initialAge: 8 }, T0 + 2000), { age: 10, state: 'stale-while-revalidate' });
});

test('ageHeader: 文字列。時計が戻っても負にしない', () => {
  assert.equal(ageHeader(info, T0 + 3500), '3');
  assert.equal(ageHeader({ ...info, initialAge: 5 }, T0), '5');
  assert.equal(ageHeader(info, T0 - 5000), '0');
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
