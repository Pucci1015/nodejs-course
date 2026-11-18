// 練習問題1 のテスト
// 使い方: node --test to-booking.test.ts
//   模範解答を試す: MODULE=../solutions/to-booking.ts node --test to-booking.test.ts
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './to-booking.ts');
const mod: typeof import('./to-booking.ts') = await import(pathToFileURL(file).href);
const { toBooking } = mod;

const record = {
  id: 7,
  roomId: 1,
  roomName: '会議室A',
  userId: 3,
  title: '定例',
  startsAt: new Date('2026-12-10T10:00:00+09:00'),
  endsAt: new Date('2026-12-10T11:00:00+09:00'),
  canceledAt: null,
};

test('予約した本人から見ると mine: true。時刻は UTC の ISO 8601', () => {
  assert.deepEqual(toBooking(record, 3), {
    id: 7,
    roomId: 1,
    roomName: '会議室A',
    title: '定例',
    startsAt: '2026-12-10T01:00:00.000Z',
    endsAt: '2026-12-10T02:00:00.000Z',
    mine: true,
  });
});

test('ほかの人から見ると mine: false。userId と canceledAt は、どちらから見ても出さない', () => {
  const b = toBooking(record, 4);
  assert.equal(b.mine, false);
  assert.equal('userId' in b, false);
  assert.equal('canceledAt' in b, false);
  assert.equal(Object.keys(b).length, 7);
});

test('tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
