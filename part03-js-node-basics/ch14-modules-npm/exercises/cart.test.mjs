// 練習問題1 用: cart.mjs と cart-main.mjs のテスト
// 使い方: node --test cart.test.mjs
//   模範解答を試す: DIR=../solutions node --test cart.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const dir = path.resolve(import.meta.dirname, process.env.DIR ?? '.');
const run = (file) => execFileSync(process.execPath, [path.join(dir, file)], { encoding: 'utf8' });

test('cart.mjs は subtotal と withTax を名前付きで export する', async () => {
  const mod = await import(pathToFileURL(path.join(dir, 'cart.mjs')).href);
  assert.equal(typeof mod.subtotal, 'function', 'subtotal がありません');
  assert.equal(typeof mod.withTax, 'function', 'withTax がありません');
  assert.equal(mod.subtotal([{ price: 100, qty: 2 }]), 200);
  assert.equal(mod.withTax(1000), 1100);
  assert.equal(mod.withTax(1000, 0.08), 1080);
});

test('cart.mjs は formatYen を default で export する', async () => {
  const mod = await import(pathToFileURL(path.join(dir, 'cart.mjs')).href);
  assert.equal(typeof mod.default, 'function', 'default export がありません');
  assert.equal(mod.default(1234), '1,234円');
});

test('cart.mjs は、読み込んだだけでは何も表示しない', () => {
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(pathToFileURL(path.join(dir, 'cart.mjs')).href)})`], { encoding: 'utf8' });
  assert.equal(out, '');
});

test('cart-main.mjs は、cart-all.mjs と同じ表示をする', () => {
  assert.equal(run('cart-main.mjs'), execFileSync(process.execPath, [path.join(import.meta.dirname, 'cart-all.mjs')], { encoding: 'utf8' }));
});

test('cart-main.mjs は、計算の関数を自分で持たず、cart.mjs から import する', async () => {
  const fs = await import('node:fs/promises');
  const src = await fs.readFile(path.join(dir, 'cart-main.mjs'), 'utf8');
  assert.match(src, /from '\.\/cart\.mjs'/, "import ... from './cart.mjs' がありません");
  assert.doesNotMatch(src, /function (subtotal|withTax|formatYen)/, 'cart-main.mjs の中に関数が残っています');
});
