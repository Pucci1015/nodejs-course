// 日本の時刻と UTC の行き来（src/domain/time.ts）
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays, dayRange, hhmm, isDateString, tokyoDateTime, tokyoParts } from '../../src/domain/time.ts';

test('isDateString: 本当にある日付だけ', () => {
  assert.equal(isDateString('2026-12-10'), true);
  assert.equal(isDateString('2028-02-29'), true); // うるう年
  for (const s of ['2026-02-30', '2026-13-01', '2026-1-5', '20261210', '2026-12-10T00:00', ''])
    assert.equal(isDateString(s), false, s);
});

test('tokyoParts: UTC の 15:00 は、日本の次の日の 0:00', () => {
  assert.deepEqual(tokyoParts(new Date('2026-12-10T01:30:00Z')), { date: '2026-12-10', minutes: 10 * 60 + 30 });
  assert.deepEqual(tokyoParts(new Date('2026-12-10T15:00:00Z')), { date: '2026-12-11', minutes: 0 });
  assert.deepEqual(tokyoParts(new Date('2026-12-10T14:59:00Z')), { date: '2026-12-10', minutes: 23 * 60 + 59 });
});

test('tokyoDateTime: 日本の 9:00 は UTC の 0:00。tokyoParts と行き来できる', () => {
  assert.equal(tokyoDateTime('2026-12-10', 9 * 60).toISOString(), '2026-12-10T00:00:00.000Z');
  assert.equal(tokyoDateTime('2026-12-10', 0).toISOString(), '2026-12-09T15:00:00.000Z');
  for (const minutes of [0, 8 * 60, 21 * 60, 23 * 60 + 30])
    assert.deepEqual(tokyoParts(tokyoDateTime('2026-12-10', minutes)), { date: '2026-12-10', minutes });
  assert.throws(() => tokyoDateTime('2026-02-30', 0), RangeError);
});

test('addDays: 月・年・うるう年をまたぐ', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2026-12-10', 60), '2027-02-08');
});

test('dayRange: 日本の 0 時から翌日の 0 時まで', () => {
  const { from, to } = dayRange('2026-12-10');
  assert.equal(from.toISOString(), '2026-12-09T15:00:00.000Z');
  assert.equal(to.toISOString(), '2026-12-10T15:00:00.000Z');
});

test('hhmm: 分を HH:MM に', () => {
  assert.equal(hhmm(8 * 60), '08:00');
  assert.equal(hhmm(21 * 60 - 30), '20:30');
});
