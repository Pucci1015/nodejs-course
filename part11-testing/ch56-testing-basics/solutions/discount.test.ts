// 練習問題7 の模範解答: カバレッジの表で「通っていない行・分かれ道」を見て、1つずつテストを足す
// 確かめ方（exercises/ で）:
//   node --test --experimental-test-coverage --test-coverage-include='**/discount.ts' \
//     --test-coverage-lines=100 --test-coverage-branches=100 ../solutions/discount.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? '../exercises/discount.ts');
const { total }: typeof import('../exercises/discount.ts') = await import(pathToFileURL(file).href);

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

// 追加: OFF の3つの道（引ける・0 円で止まる・数でない）
test('OFF500 は 500 円引き', () => {
  assert.equal(total(lines, 'OFF500'), 201);
});

test('引きすぎても 0 円より下にはならない', () => {
  assert.equal(total(lines, 'OFF1000'), 0);
});

test('OFF の後が正の整数でなければ例外', () => {
  assert.throws(() => total(lines, 'OFFabc'), /知らないクーポンです: OFFabc/);
  assert.throws(() => total(lines, 'OFF0'), /知らないクーポンです/);
});

// 追加: どれでもないクーポン、数の間違い
test('知らないクーポンは例外', () => {
  assert.throws(() => total(lines, 'FREE'), /知らないクーポンです: FREE/);
});

test('quantity が 0 なら RangeError', () => {
  assert.throws(() => total([{ price: 100, quantity: 0 }]), RangeError);
});
