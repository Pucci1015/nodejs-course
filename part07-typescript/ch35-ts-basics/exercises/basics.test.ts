// 練習問題1 のテスト
// 使い方: node --test basics.test.ts
//   模範解答を試す: MODULE=../solutions/basics.ts node --test basics.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './basics.ts');
const m = await import(pathToFileURL(file).href);

test('add: 2つの数を足す', () => {
  assert.equal(m.add(1, 2), 3);
  assert.equal(m.add(-5, 0.5), -4.5);
});

test('average: 平均。空の配列なら 0', () => {
  assert.equal(m.average([80, 90, 70]), 80);
  assert.equal(m.average([1, 2]), 1.5);
  assert.equal(m.average([]), 0);
});

test('formatPrice: 円を付ける。withTax が true なら 1.1 倍して四捨五入し、（税込）を付ける', () => {
  assert.equal(m.formatPrice(1000), '1000円');
  assert.equal(m.formatPrice(1000, false), '1000円');
  assert.equal(m.formatPrice(1000, true), '1100円（税込）');
  assert.equal(m.formatPrice(98, true), '108円（税込）');
});

test('line: char を width 個つなげる。width を渡さなければ 10 個', () => {
  assert.equal(m.line('-', 3), '---');
  assert.equal(m.line('='), '==========');
});

test('型: tsc のエラーが無い（basics.check.ts の確かめを含む）', () => {
  assert.deepEqual(typeErrors([file, checkFileOf(file)]), []);
});
