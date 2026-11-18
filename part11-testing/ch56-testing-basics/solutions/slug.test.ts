// 練習問題1 の模範解答: toSlug のテスト
// 確かめ方（exercises/ で）: node ../../tools/check-tests.ts ../solutions/slug.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? '../exercises/slug.ts');
const { toSlug }: typeof import('../exercises/slug.ts') = await import(pathToFileURL(file).href);

test('空白は - になる', () => {
  assert.equal(toSlug('buy milk'), 'buy-milk');
});

// 追加: 決まりを1つずつ、1つのテストで確かめる
test('大文字は小文字になる', () => {
  assert.equal(toSlug('Buy Milk'), 'buy-milk');
});

test('_ も - になる', () => {
  assert.equal(toSlug('buy_milk'), 'buy-milk');
});

test('全角の英数字は半角になる', () => {
  assert.equal(toSlug('ＡＢＣ１２３'), 'abc123');
});

test('英数字と - のほかは消える', () => {
  assert.equal(toSlug('牛乳 (milk)!'), 'milk');
});

test('続いた - は1つになる', () => {
  assert.equal(toSlug('a  -  b'), 'a-b');
});

test('最初と最後の - は消える', () => {
  assert.equal(toSlug(' -milk- '), 'milk');
});

test('50 文字で切り、切ったところの - は消す', () => {
  assert.equal(toSlug('a'.repeat(60)), 'a'.repeat(50));
  assert.equal(toSlug(`${'a'.repeat(49)} b`), 'a'.repeat(49)); // 50 文字目が - になる
});

test('使える文字が無ければ null', () => {
  assert.equal(toSlug('牛乳'), null);
  assert.equal(toSlug(''), null);
});
