// 練習問題1 用: params.mjs のテスト
// 使い方: node --test params.test.mjs
//   模範解答を試す: MODULE=../solutions/params.mjs node --test params.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './params.mjs')).href);

test('parseId: 正の整数の形なら数にする', () => {
  assert.equal(m.parseId('1'), 1);
  assert.equal(m.parseId('42'), 42);
});

test('parseId: 0・先頭の 0・負の数・小数・空は null', () => {
  for (const s of ['0', '042', '-1', '1.5', '', ' 1']) assert.equal(m.parseId(s), null, s);
});

test('parseId: 数字でないもの、大きすぎる数は null', () => {
  for (const s of ['abc', '1e3', '0x10', '99999999999999999999']) assert.equal(m.parseId(s), null, s);
  assert.equal(m.parseId(undefined), null);
});

test('toArray: 無ければ空の配列', () => {
  assert.deepEqual(m.toArray(undefined), []);
});

test('toArray: 文字列なら1つの配列', () => {
  assert.deepEqual(m.toArray('a'), ['a']);
  assert.deepEqual(m.toArray(''), ['']);
});

test('toArray: 配列ならそのまま', () => {
  assert.deepEqual(m.toArray(['a', 'b']), ['a', 'b']);
});
