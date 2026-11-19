// 練習問題2 のテスト
// 使い方: node --test weekday.test.ts
//   模範解答を試す: MODULE=../solutions/weekday.ts node --test weekday.test.ts
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './weekday.ts');
const mod: typeof import('./weekday.ts') = await import(pathToFileURL(file).href);
const { weekdayOf, isWeekend } = mod;

test('weekdayOf: 1週間分', () => {
  const days = ['2026-12-06', '2026-12-07', '2026-12-08', '2026-12-09', '2026-12-10', '2026-12-11', '2026-12-12'];
  assert.deepEqual(days.map(weekdayOf), ['日', '月', '火', '水', '木', '金', '土']);
});

test('weekdayOf: うるう日と、年の変わり目', () => {
  assert.equal(weekdayOf('2028-02-29'), '火');
  assert.equal(weekdayOf('2027-01-01'), '金');
});

test('weekdayOf: 日付でなければ RangeError（文に、その文字を含む）', () => {
  assert.throws(() => weekdayOf('2026-02-30'), { name: 'RangeError', message: /2026-02-30/ });
  assert.throws(() => weekdayOf('12/10'), RangeError);
});

test('isWeekend', () => {
  assert.equal(isWeekend('2026-12-12'), true);
  assert.equal(isWeekend('2026-12-13'), true);
  assert.equal(isWeekend('2026-12-14'), false);
});

test('tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
