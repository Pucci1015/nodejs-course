// sum.mjs のテスト（第7章 8節）
// 使い方: node --test sum.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sum } from './sum.mjs';

test('sum: 合計を返す', () => {
  assert.equal(sum([1, 2, 3]), 6);
});

test('sum: 空の配列なら 0', () => {
  assert.equal(sum([]), 0);
});
