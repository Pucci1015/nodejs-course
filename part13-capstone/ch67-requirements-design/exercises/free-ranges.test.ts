// 練習問題5 のテスト
// 使い方: node --test free-ranges.test.ts
//   模範解答を試す: MODULE=../solutions/free-ranges.ts node --test free-ranges.test.ts
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './free-ranges.ts');
const mod: typeof import('./free-ranges.ts') = await import(pathToFileURL(file).href);
const { freeRanges } = mod;

const D = '2026-12-10';
const b = (s: string, e: string, date = D) => ({
  startsAt: new Date(`${date}T${s}:00+09:00`),
  endsAt: new Date(`${date}T${e}:00+09:00`),
});

test('予約が無ければ、8:00〜21:00 がまるごと空き', () => {
  assert.deepEqual(freeRanges(D, []), [{ start: '08:00', end: '21:00' }]);
});

test('予約の間が空き。順番がばらばらでも、早い順に返す', () => {
  assert.deepEqual(freeRanges(D, [b('13:00', '14:00'), b('10:00', '11:00')]), [
    { start: '08:00', end: '10:00' },
    { start: '11:00', end: '13:00' },
    { start: '14:00', end: '21:00' },
  ]);
});

test('接している予約・重なっている予約の間には、空きを作らない', () => {
  assert.deepEqual(freeRanges(D, [b('10:00', '11:00'), b('11:00', '12:00'), b('11:30', '12:30')]), [
    { start: '08:00', end: '10:00' },
    { start: '12:30', end: '21:00' },
  ]);
});

test('朝からの予約・夜までの予約の端には、空きを作らない', () => {
  assert.deepEqual(freeRanges(D, [b('08:00', '09:00'), b('20:00', '21:00')]), [{ start: '09:00', end: '20:00' }]);
  assert.deepEqual(freeRanges(D, [b('08:00', '21:00')]), []);
});

test('営業時間の外にはみ出した部分と、ほかの日の予約は無視する', () => {
  const night = { startsAt: new Date(`${D}T20:30:00+09:00`), endsAt: new Date('2026-12-11T09:00:00+09:00') };
  assert.deepEqual(freeRanges(D, [b('07:00', '08:30'), night, b('10:00', '11:00', '2026-12-11')]), [
    { start: '08:30', end: '20:30' },
  ]);
});

test('tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
