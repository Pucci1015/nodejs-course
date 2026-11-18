// 練習問題7: カバレッジが 100% になるまで、テストを書き足す
// 使い方:
//   node --test --experimental-test-coverage --test-coverage-include='**/discount.ts' \
//     --test-coverage-lines=100 --test-coverage-branches=100 discount.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './discount.ts');
const { total }: typeof import('./discount.ts') = await import(pathToFileURL(file).href);

const lines = [
  { price: 300, quantity: 2 },
  { price: 101, quantity: 1 },
];

test('クーポンなし', () => {
  assert.equal(total(lines), 701);
});

test('HALF は半額で、1円未満は切り捨て', () => {
  assert.equal(total(lines, 'HALF'), 350);
});

// ここを書く（テストを書き足す）
