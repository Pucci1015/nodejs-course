// 練習問題3 のテスト
// 使い方: node --test booking-length.test.ts
//   模範解答を試す: MODULE=../solutions/booking-length.ts node --test booking-length.test.ts
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './booking-length.ts');
const mod: typeof import('./booking-length.ts') = await import(pathToFileURL(file).href);
const { lengthMinutes, formatLength } = mod;

const jst = (hm: string) => new Date(`2026-12-10T${hm}:00+09:00`);

test('lengthMinutes', () => {
  assert.equal(lengthMinutes(jst('10:00'), jst('11:30')), 90);
  assert.equal(lengthMinutes(jst('10:00'), jst('10:00')), 0);
  assert.equal(lengthMinutes(new Date('2026-12-10T14:30:00Z'), new Date('2026-12-10T15:30:00Z')), 60); // 日本の日をまたいでも
  assert.throws(() => lengthMinutes(jst('11:00'), jst('10:00')), RangeError);
});

test('formatLength', () => {
  assert.equal(formatLength(30), '30 分');
  assert.equal(formatLength(60), '1 時間');
  assert.equal(formatLength(90), '1 時間 30 分');
  assert.equal(formatLength(180), '3 時間');
  assert.equal(formatLength(45), '45 分');
  assert.equal(formatLength(125), '2 時間 5 分');
});

test('formatLength: 0 以下・整数でないものは RangeError', () => {
  for (const m of [0, -30, 1.5, Number.NaN]) assert.throws(() => formatLength(m), RangeError, String(m));
});

test('tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
