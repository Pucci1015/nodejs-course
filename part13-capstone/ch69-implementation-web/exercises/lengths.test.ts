// 練習問題1 のテスト
// 使い方: node --test lengths.test.ts
//   模範解答を試す: MODULE=../solutions/lengths.ts node --test lengths.test.ts
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './lengths.ts');
const mod: typeof import('./lengths.ts') = await import(pathToFileURL(file).href);
const { lengthsFrom, lengthLabel, optionLabel } = mod;

const hm = (h: number, m = 0) => h * 60 + m;

test('lengthsFrom: 30 分から 3 時間まで。21:00 を過ぎるものは入れない', () => {
  assert.deepEqual(lengthsFrom(hm(10)), [30, 60, 90, 120, 150, 180]);
  assert.deepEqual(lengthsFrom(hm(19)), [30, 60, 90, 120]);
  assert.deepEqual(lengthsFrom(hm(20, 30)), [30]);
  assert.deepEqual(lengthsFrom(hm(21)), [], '21:00 からは選べない');
});

test('lengthLabel: 分・時間・時間と分', () => {
  assert.equal(lengthLabel(30), '30 分');
  assert.equal(lengthLabel(60), '1 時間');
  assert.equal(lengthLabel(90), '1 時間 30 分');
  assert.equal(lengthLabel(180), '3 時間');
});

test('optionLabel: 長さと、終わりの時刻', () => {
  assert.equal(optionLabel(hm(14), 90), '1 時間 30 分（〜15:30）');
  assert.equal(optionLabel(hm(8), 30), '30 分（〜08:30）');
  assert.equal(optionLabel(hm(18), 180), '3 時間（〜21:00）');
});

test('型のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
