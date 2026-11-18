// 第59章 4節: 注文の合計のテスト（test.only が残っている）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { total } from './orders.ts';

test('合計は、値段 × 数を足したもの', () => {
  assert.equal(total({ id: 1, items: [{ price: 100, qty: 2 }, { price: 50, qty: 1 }] }), 250);
});

test.only('クーポン HALF なら半分', () => {
  assert.equal(total({ id: 1, items: [{ price: 100, qty: 2 }], coupon: 'HALF' }), 100);
});
