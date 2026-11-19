// 練習問題3 のテスト
// 使い方: node --test day-nav.test.ts
//   模範解答を試す: MODULE=../solutions/day-nav.ts node --test day-nav.test.ts
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './day-nav.ts');
const mod: typeof import('./day-nav.ts') = await import(pathToFileURL(file).href);
const { pickDate, searchFor, dayNav } = mod;

const TODAY = '2026-12-10';

test('pickDate: 正しい日付ならそれ。無い・正しくなければ今日', () => {
  assert.equal(pickDate('2026-12-24', TODAY), '2026-12-24');
  assert.equal(pickDate('2026-12-01', TODAY), '2026-12-01', '過去の日も表示はできる');
  for (const bad of [null, '', 'tomorrow', '2026-02-30', '2026-12-1'])
    assert.equal(pickDate(bad, TODAY), TODAY, String(bad));
});

test('searchFor: 今日なら {}、ほかの日なら { date }', () => {
  assert.deepEqual(searchFor(TODAY, TODAY), {});
  assert.deepEqual(searchFor('2026-12-11', TODAY), { date: '2026-12-11' });
});

test('dayNav: 月や年をまたぐ。今日かどうか', () => {
  assert.deepEqual(dayNav(TODAY, TODAY), { prev: '2026-12-09', next: '2026-12-11', isToday: true });
  assert.deepEqual(dayNav('2026-12-31', TODAY), { prev: '2026-12-30', next: '2027-01-01', isToday: false });
  assert.deepEqual(dayNav('2028-03-01', TODAY), { prev: '2028-02-29', next: '2028-03-02', isToday: false });
});

test('型のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
