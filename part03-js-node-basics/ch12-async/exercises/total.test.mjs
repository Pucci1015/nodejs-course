// 練習問題2 用: total.mjs（buggy-total.mjs を直したもの）のテスト
// 使い方: node --test total.test.mjs
//   直す前のものを試す: MODULE=./buggy-total.mjs node --test total.test.mjs
//   模範解答を試す: MODULE=../solutions/total.mjs node --test total.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './total.mjs');
const { totalPrice } = await import(pathToFileURL(modulePath).href);

const prices = { apple: 120, bread: 230, milk: 300 };
const getPrice = (id) =>
  new Promise((resolve, reject) =>
    setTimeout(() => (id in prices ? resolve(prices[id]) : reject(new Error(`${id} はありません`))), 20),
  );

test('3つの値段の合計を返す', async () => {
  assert.equal(await totalPrice(['apple', 'bread', 'milk'], getPrice), 650);
});

test('同じものが2回あれば、2回足す', async () => {
  assert.equal(await totalPrice(['apple', 'apple'], getPrice), 240);
});

test('空の配列なら 0', async () => {
  assert.equal(await totalPrice([], getPrice), 0);
});

test('問い合わせに失敗したら、totalPrice も失敗する', async () => {
  await assert.rejects(totalPrice(['apple', 'cake'], getPrice), { message: 'cake はありません' });
});
