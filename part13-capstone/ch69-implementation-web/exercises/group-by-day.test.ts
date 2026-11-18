// 練習問題6 のテスト
// 使い方: node --test group-by-day.test.ts
//   模範解答を試す: MODULE=../solutions/group-by-day.ts node --test group-by-day.test.ts
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './group-by-day.ts');
const mod: typeof import('./group-by-day.ts') = await import(pathToFileURL(file).href);
const { groupByDay } = mod;

const b = (iso: string, title: string) => ({ startsAt: iso, title });

test('日本の日付ごとに、早い順', () => {
  const list = [
    b('2026-12-11T01:00:00.000Z', '11日 10:00'),
    b('2026-12-10T05:00:00.000Z', '10日 14:00'),
    b('2026-12-10T01:00:00.000Z', '10日 10:00'),
  ];
  assert.deepEqual(
    groupByDay(list).map((g) => [g.date, g.items.map((x) => x.title)]),
    [
      ['2026-12-10', ['10日 10:00', '10日 14:00']],
      ['2026-12-11', ['11日 10:00']],
    ],
  );
});

test('日本の 8:00（UTC では前の日の 23:00）は、日本の日付に入る', () => {
  const groups = groupByDay([b('2026-12-09T23:00:00.000Z', '10日 8:00'), b('2026-12-09T05:00:00.000Z', '9日 14:00')]);
  assert.deepEqual(
    groups.map((g) => g.date),
    ['2026-12-09', '2026-12-10'],
  );
});

test('空なら空。引数の配列は並べ替えない', () => {
  assert.deepEqual(groupByDay([]), []);
  const list = [b('2026-12-11T01:00:00.000Z', 'a'), b('2026-12-10T01:00:00.000Z', 'b')];
  groupByDay(list);
  assert.deepEqual(
    list.map((x) => x.title),
    ['a', 'b'],
  );
});

test('型のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
