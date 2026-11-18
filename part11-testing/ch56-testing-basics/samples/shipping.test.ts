// 第56章 8節: わざと足りないテスト。カバレッジで、確かめていない所を見つける
// 使い方: node --test --experimental-test-coverage samples/shipping.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shippingFee } from './shipping.ts';

test('ふつうは 600 円', () => {
  assert.equal(shippingFee(1000), 600);
});

test('5000 円から無料', () => {
  assert.equal(shippingFee(5000), 0);
});
