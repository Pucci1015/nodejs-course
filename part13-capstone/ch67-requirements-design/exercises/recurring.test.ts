// 練習問題8 のテスト
// 使い方: node --test recurring.test.ts
//   模範解答を試す: MODULE=../solutions/recurring.ts node --test recurring.test.ts
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './recurring.ts');
const mod: typeof import('./recurring.ts') = await import(pathToFileURL(file).href);
const { expandWeekly } = mod;

const now = new Date('2026-12-01T09:00:00+09:00');
const iso = (date: string, hm: string) => new Date(`${date}T${hm}:00+09:00`).toISOString();

test('4回分。日付は 7 日ずつ。どれも決まりに合う', () => {
  const r = expandWeekly({ date: '2026-12-10', start: '10:00', minutes: 60, weeks: 4 }, now);
  assert.deepEqual(
    r.map((o) => [o.date, o.startsAt.toISOString(), o.endsAt.toISOString(), o.issues]),
    [
      ['2026-12-10', iso('2026-12-10', '10:00'), iso('2026-12-10', '11:00'), []],
      ['2026-12-17', iso('2026-12-17', '10:00'), iso('2026-12-17', '11:00'), []],
      ['2026-12-24', iso('2026-12-24', '10:00'), iso('2026-12-24', '11:00'), []],
      ['2026-12-31', iso('2026-12-31', '10:00'), iso('2026-12-31', '11:00'), []],
    ],
  );
});

test('月と年をまたぐ', () => {
  const r = expandWeekly({ date: '2026-12-24', start: '13:30', minutes: 30, weeks: 3 }, now);
  assert.deepEqual(
    r.map((o) => o.date),
    ['2026-12-24', '2026-12-31', '2027-01-07'],
  );
});

test('60 日より先の回には、その理由が入る（ほかの回は入る）', () => {
  const r = expandWeekly({ date: '2026-12-10', start: '10:00', minutes: 60, weeks: 12 }, now);
  assert.equal(r.length, 12);
  // 2026-12-01 の 60 日後は 2027-01-30。最後の回は 2027-02-25
  assert.deepEqual(r[7]?.issues, []); // 2027-01-28
  assert.deepEqual(r[8]?.issues, ['予約できるのは 60 日先までです']); // 2027-02-04
});

test('決まりに合わない時刻（20:30 から 1 時間）は、どの回にも理由が入る', () => {
  const r = expandWeekly({ date: '2026-12-10', start: '20:30', minutes: 60, weeks: 2 }, now);
  assert.deepEqual(
    r.map((o) => o.issues),
    [['予約できるのは 08:00〜21:00 です'], ['予約できるのは 08:00〜21:00 です']],
  );
});

test('入力の形が正しくなければ RangeError', () => {
  const ok = { date: '2026-12-10', start: '10:00', minutes: 60, weeks: 2 };
  for (const bad of [
    { ...ok, date: '2026-12-32' },
    { ...ok, start: '9:00' },
    { ...ok, start: '24:00' },
    { ...ok, weeks: 0 },
    { ...ok, weeks: 13 },
    { ...ok, weeks: 1.5 },
  ])
    assert.throws(() => expandWeekly(bad, now), RangeError, JSON.stringify(bad));
});

test('tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
