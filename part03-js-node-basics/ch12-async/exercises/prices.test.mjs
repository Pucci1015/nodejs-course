// 練習問題3 用: prices.mjs のテスト
// 使い方: node --test prices.test.mjs
//   模範解答を試す: MODULE=../solutions/prices.mjs node --test prices.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './prices.mjs');
const { getPricesSerial, getPricesParallel, getPricesSettled } = await import(pathToFileURL(modulePath).href);

const prices = { apple: 120, bread: 230, milk: 300 };
// 値段ごとに、かかる時間を変える（apple 120ms、bread 60ms、milk 30ms）。無いものは 30ms で失敗する
const waitMs = { apple: 120, bread: 60, milk: 30 };
function makeGetPrice() {
  const calls = { running: 0, max: 0 };
  const getPrice = (id) => {
    calls.running++;
    calls.max = Math.max(calls.max, calls.running);
    return new Promise((resolve, reject) =>
      setTimeout(() => {
        calls.running--;
        if (id in prices) resolve(prices[id]);
        else reject(new Error(`${id} はありません`));
      }, waitMs[id] ?? 30),
    );
  };
  return { getPrice, calls };
}

const ids = ['apple', 'bread', 'milk'];

test('getPricesSerial: ids の順に値段を返す', async () => {
  const { getPrice } = makeGetPrice();
  assert.deepEqual(await getPricesSerial(ids, getPrice), [120, 230, 300]);
});

test('getPricesSerial: 1つずつ問い合わせる（同時に動くのは1つだけ）', async () => {
  const { getPrice, calls } = makeGetPrice();
  await getPricesSerial(ids, getPrice);
  assert.equal(calls.max, 1, `同時に ${calls.max} 個動いていました`);
});

test('getPricesSerial: 失敗したら、その失敗で失敗する', async () => {
  const { getPrice } = makeGetPrice();
  await assert.rejects(getPricesSerial(['apple', 'cake'], getPrice), { message: 'cake はありません' });
});

test('getPricesParallel: 終わった順ではなく、ids の順に値段を返す', async () => {
  const { getPrice } = makeGetPrice();
  assert.deepEqual(await getPricesParallel(ids, getPrice), [120, 230, 300]);
});

test('getPricesParallel: 全部を同時に問い合わせる（時間はいちばん長いものくらい）', async () => {
  const { getPrice, calls } = makeGetPrice();
  const start = Date.now();
  await getPricesParallel(ids, getPrice);
  const took = Date.now() - start;
  assert.equal(calls.max, 3, `同時に動いたのは ${calls.max} 個でした`);
  assert.ok(took < 200, `${took}ms かかりました（直列なら 210ms、並行なら 120ms くらい）`);
});

test('getPricesParallel: 1つでも失敗したら、その失敗で失敗する', async () => {
  const { getPrice } = makeGetPrice();
  await assert.rejects(getPricesParallel(['apple', 'cake'], getPrice), { message: 'cake はありません' });
});

test('getPricesSettled: 成功したものと失敗したものに分ける', async () => {
  const { getPrice } = makeGetPrice();
  const result = await getPricesSettled(['apple', 'cake', 'milk', 'tea'], getPrice);
  assert.deepEqual(result, { prices: { apple: 120, milk: 300 }, failed: ['cake', 'tea'] });
});

test('getPricesSettled: 全部を同時に問い合わせる', async () => {
  const { getPrice, calls } = makeGetPrice();
  await getPricesSettled(ids, getPrice);
  assert.equal(calls.max, 3, `同時に動いたのは ${calls.max} 個でした`);
});
