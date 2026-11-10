// 練習問題2 用: cart.cjs のテスト
// 使い方: node --test cart-cjs.test.mjs
//   模範解答を試す: MODULE=../solutions/cart.cjs node --test cart-cjs.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './cart.cjs');
const require = createRequire(import.meta.url);

test('require すると、3つの関数が入ったオブジェクトが返る', () => {
  const cart = require(modulePath);
  assert.deepEqual(Object.keys(cart).sort(), ['formatYen', 'subtotal', 'withTax']);
});

test('3つの関数が、cart.mjs と同じ結果を返す', () => {
  const { subtotal, withTax, formatYen } = require(modulePath);
  assert.equal(subtotal([{ price: 180, qty: 3 }, { price: 120, qty: 2 }]), 780);
  assert.equal(withTax(1000), 1100);
  assert.equal(withTax(1000, 0.08), 1080);
  assert.equal(formatYen(2508), '2,508円');
});

test('ES Modules から import すると、default は module.exports そのもの', async () => {
  const mod = await import(pathToFileURL(modulePath).href);
  assert.equal(mod.default, require(modulePath));
});

test('ES Modules から、名前付きでも import できる', async () => {
  const mod = await import(pathToFileURL(modulePath).href);
  assert.equal(typeof mod.subtotal, 'function', '名前付きで import できません（module.exports = { ... } の形で書きましたか）');
  assert.equal(typeof mod.formatYen, 'function');
});

test('require しただけでは、何も表示しない', () => {
  const out = execFileSync(process.execPath, ['-e', `require(${JSON.stringify(modulePath)})`], { encoding: 'utf8' });
  assert.equal(out, '');
});
