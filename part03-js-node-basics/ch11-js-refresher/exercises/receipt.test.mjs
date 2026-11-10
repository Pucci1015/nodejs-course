// 練習問題3 用: receipt.mjs（buggy-receipt.mjs を直したもの）のテスト
// 使い方: node --test receipt.test.mjs
//   直す前のものを試す: MODULE=./buggy-receipt.mjs node --test receipt.test.mjs
//   模範解答を試す:     MODULE=../solutions/receipt.mjs node --test receipt.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './receipt.mjs');
const { makeReceipt, DEFAULT_OPTIONS } = await import(pathToFileURL(modulePath).href);

function makeItems() {
  return [
    { name: 'ペン', price: 150, count: 1 },
    { name: 'ノート', price: 500, count: 2 },
  ];
}

test('既定の設定では、税率 10%、表記は「合計」。商品は名前の順', () => {
  assert.deepEqual(makeReceipt(makeItems()), ['ノート x2  1000円', 'ペン x1  150円', '消費税 115円', '合計 1265円']);
});

test('overrides で、税率と表記を変えられる', () => {
  assert.deepEqual(makeReceipt([{ name: 'ペン', price: 150, count: 1 }], { taxRate: 0.08, totalLabel: 'お会計' }), [
    'ペン x1  150円',
    '消費税 12円',
    'お会計 162円',
  ]);
});

test('overrides を使った後でも、次の呼び出しは既定の設定に戻る', () => {
  makeReceipt(makeItems(), { taxRate: 0.08, totalLabel: 'お会計' });
  assert.deepEqual(makeReceipt(makeItems()).slice(-2), ['消費税 115円', '合計 1265円']);
});

test('DEFAULT_OPTIONS は変わらない', () => {
  makeReceipt(makeItems(), { taxRate: 0.08 });
  assert.deepEqual(DEFAULT_OPTIONS, { taxRate: 0.1, totalLabel: '合計' });
});

test('渡した items の順番は変えない', () => {
  const items = makeItems();
  makeReceipt(items);
  assert.deepEqual(items.map((i) => i.name), ['ペン', 'ノート']);
});
