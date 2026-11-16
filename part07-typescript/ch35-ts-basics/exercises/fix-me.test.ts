// 練習問題3 のテスト
// 使い方: node --test fix-me.test.ts
//   模範解答を試す: MODULE=../solutions/fix-me.ts node --test fix-me.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './fix-me.ts');
const m = await import(pathToFileURL(file).href);
const items = [
  { name: 'りんご', price: 120, qty: 3 },
  { name: 'パン', price: 98, qty: 1 },
  { name: '牛乳', price: 210, qty: 2 },
];

test('total: 数の合計を返す（文字列をつなげない）', () => {
  assert.equal(m.total(items), 878);
  assert.equal(m.total([]), 0);
});

test('cheapest: いちばん安い品物。空なら （なし）', () => {
  assert.equal(m.cheapest(items), 'パン');
  assert.equal(m.cheapest([]), '（なし）');
});

test('findItem: 名前で探す。無ければ undefined', () => {
  assert.deepEqual(m.findItem(items, '牛乳'), { name: '牛乳', price: 210, qty: 2 });
  assert.equal(m.findItem(items, 'バター'), undefined);
});

test('receipt と SALE_PRICE', () => {
  assert.equal(m.receipt(items.slice(0, 2)), 'りんご x3\nパン x1\n合計 458円');
  assert.equal(m.SALE_PRICE, 900);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});

test('ルール: any・as・!・@ts- を使っていない', () => {
  // コメントを除いてから調べる
  const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(code, /\bany\b/, 'any を使わない');
  assert.doesNotMatch(code, /\bas\s+(?!const\b)[A-Za-z]/, 'as を使わない');
  assert.doesNotMatch(code, /[\w\])]!(?!=)/, '! で「undefined ではない」と言い切らない');
  assert.doesNotMatch(readFileSync(file, 'utf8'), /@ts-/, '@ts- のコメントを使わない');
});
