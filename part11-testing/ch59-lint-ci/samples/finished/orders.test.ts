// 第59章 4節: 注文の合計のテスト（test.only を消した完成形）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { total } from './orders.ts';

test('合計は、値段 × 数を足したもの', () => {
  assert.equal(
    total({
      id: 1,
      items: [
        { price: 100, qty: 2 },
        { price: 50, qty: 1 },
      ],
    }),
    250,
  );
});

// 修正: test.only を test に戻した（残すと、ほかのテストが動かない）
test('クーポン HALF なら半分', () => {
  assert.equal(total({ id: 1, items: [{ price: 100, qty: 2 }], coupon: 'HALF' }), 100);
});
