// 予約の時刻の決まり（src/domain/booking-rules.ts）。境目の値を表にして並べる（第56章 3節）
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canCancel, checkBookingTime } from '../../src/domain/booking-rules.ts';

// 「今」は 2026-12-10（木）の日本の 9:10
const NOW = new Date('2026-12-10T09:10:00+09:00');
const at = (s: string) => new Date(`${s}+09:00`);

const ok = [
  ['10:00〜11:00', '2026-12-10T10:00', '2026-12-10T11:00'],
  ['30 分（いちばん短い）', '2026-12-10T10:00', '2026-12-10T10:30'],
  ['3 時間（いちばん長い）', '2026-12-10T10:00', '2026-12-10T13:00'],
  ['8:00 から（いちばん早い）', '2026-12-11T08:00', '2026-12-11T08:30'],
  ['21:00 まで（いちばん遅い）', '2026-12-10T20:30', '2026-12-10T21:00'],
  ['今の後の、いちばん早い枠', '2026-12-10T09:30', '2026-12-10T10:00'],
  ['60 日先（2027-02-08）', '2027-02-08T10:00', '2027-02-08T11:00'],
] as const;
for (const [name, s, e] of ok)
  test(`よい: ${name}`, () => {
    assert.deepEqual(checkBookingTime(at(s), at(e), NOW), []);
  });

const ng = [
  [':15 に始まる', '2026-12-10T10:15', '2026-12-10T11:15', ['startsAt', 'endsAt']],
  ['秒がある', '2026-12-10T10:00:30', '2026-12-10T11:00', ['startsAt']],
  ['終わりが始まりより前', '2026-12-10T11:00', '2026-12-10T10:00', ['endsAt']],
  ['終わりと始まりが同じ', '2026-12-10T11:00', '2026-12-10T11:00', ['endsAt']],
  ['3 時間 30 分', '2026-12-10T10:00', '2026-12-10T13:30', ['endsAt']],
  ['7:30 から', '2026-12-11T07:30', '2026-12-11T08:30', ['startsAt']],
  ['21:30 まで', '2026-12-10T20:30', '2026-12-10T21:30', ['startsAt']],
  ['日をまたぐ', '2026-12-10T23:30', '2026-12-11T00:30', ['startsAt']],
  ['始まりが過ぎている', '2026-12-10T09:00', '2026-12-10T10:00', ['startsAt']],
  ['61 日先（2027-02-09）', '2027-02-09T10:00', '2027-02-09T11:00', ['startsAt']],
] as const;
for (const [name, s, e, fields] of ng)
  test(`だめ: ${name}`, () => {
    assert.deepEqual(
      checkBookingTime(at(s), at(e), NOW).map((i) => i.field),
      fields,
    );
  });

test('canCancel: 本人か管理者。始まったもの・取り消したものはだめ', () => {
  const booking = { userId: 1, startsAt: at('2026-12-10T10:00'), canceledAt: null };
  assert.equal(canCancel(booking, { id: 1, role: 'member' }, NOW), 'ok');
  assert.equal(canCancel(booking, { id: 2, role: 'member' }, NOW), 'forbidden');
  assert.equal(canCancel(booking, { id: 2, role: 'admin' }, NOW), 'ok');
  assert.equal(canCancel(booking, { id: 1, role: 'member' }, at('2026-12-10T10:00')), 'started');
  assert.equal(canCancel({ ...booking, canceledAt: NOW }, { id: 1, role: 'member' }, NOW), 'canceled');
  // ほかの人の、取り消したもの: 先に「権限が無い」と答える（あるかどうかを、ほかの人に教えすぎない）
  assert.equal(canCancel({ ...booking, canceledAt: NOW }, { id: 2, role: 'member' }, NOW), 'forbidden');
});
