// API の入力の形（src/domain/schemas.ts）
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CreateBookingBody, CreateRoomBody, DateQuery, IdParam, UpdateRoomBody } from '../../src/domain/schemas.ts';

const ok = { roomId: 1, title: ' 定例 ', startsAt: '2026-12-10T10:00:00+09:00', endsAt: '2026-12-10T01:30:00Z' };

test('CreateBookingBody: 題名は前後の空白を除き、時刻は Date にする', () => {
  const b = CreateBookingBody.parse(ok);
  assert.equal(b.title, '定例');
  assert.equal(b.startsAt.toISOString(), '2026-12-10T01:00:00.000Z');
  assert.equal(b.endsAt.toISOString(), '2026-12-10T01:30:00.000Z');
});

test('CreateBookingBody: 時差の無い日時・知らない項目・文字の roomId はだめ', () => {
  for (const bad of [
    { ...ok, startsAt: '2026-12-10T10:00:00' },
    { ...ok, startsAt: '2026-12-10' },
    { ...ok, userId: 2 },
    { ...ok, roomId: '1' },
    { ...ok, roomId: 0 },
    { ...ok, title: '' },
  ])
    assert.equal(CreateBookingBody.safeParse(bad).success, false, JSON.stringify(bad));
});

test('CreateRoomBody・UpdateRoomBody', () => {
  assert.deepEqual(CreateRoomBody.parse({ name: ' A ', capacity: 1 }), { name: 'A', capacity: 1 });
  assert.equal(CreateRoomBody.safeParse({ name: 'A', capacity: 1.5 }).success, false);
  assert.deepEqual(UpdateRoomBody.parse({ active: false }), { active: false });
  assert.equal(UpdateRoomBody.safeParse({}).success, false);
  assert.equal(UpdateRoomBody.safeParse({ id: 3 }).success, false);
});

test('DateQuery・IdParam', () => {
  assert.equal(DateQuery.safeParse({ date: '2026-12-10' }).success, true);
  assert.equal(DateQuery.safeParse({ date: '2026-02-30' }).success, false);
  assert.equal(DateQuery.safeParse({ date: ['2026-12-10', '2026-12-11'] }).success, false); // ?date= を2回
  assert.deepEqual(IdParam.parse({ id: '12' }), { id: 12 });
  for (const id of ['0', '012', '-1', '1.5', 'abc', '1'.repeat(10)])
    assert.equal(IdParam.safeParse({ id }).success, false, id);
});
