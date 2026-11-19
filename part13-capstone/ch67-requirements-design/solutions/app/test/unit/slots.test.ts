// 1日の枠と、埋まった枠（src/domain/slots.ts）
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { markBusy, slotsOfDay } from '../../src/domain/slots.ts';

test('slotsOfDay: 8:00〜21:00 を 30 分ずつ、26 個', () => {
  const slots = slotsOfDay('2026-12-10');
  assert.equal(slots.length, 26);
  assert.equal(slots[0]?.label, '08:00');
  assert.equal(slots[0]?.start.toISOString(), '2026-12-09T23:00:00.000Z');
  assert.equal(slots.at(-1)?.label, '20:30');
  assert.equal(slots.at(-1)?.end.toISOString(), '2026-12-10T12:00:00.000Z');
});

test('markBusy: 予約が重なる枠に、その予約。境目（終わりの時刻の枠）は重ならない', () => {
  const slots = slotsOfDay('2026-12-10');
  const a = { id: 1, startsAt: '2026-12-10T01:00:00.000Z', endsAt: '2026-12-10T02:00:00.000Z' }; // 10:00〜11:00
  const b = { id: 2, startsAt: new Date('2026-12-10T11:30:00Z'), endsAt: new Date('2026-12-10T12:00:00Z') }; // 20:30〜21:00
  const busy = markBusy(slots, [a, b]);
  const labels = (x: typeof a | typeof b) => slots.filter((_, i) => busy[i] === x).map((s) => s.label);
  assert.deepEqual(labels(a), ['10:00', '10:30']);
  assert.deepEqual(labels(b), ['20:30']);
  assert.equal(busy.filter((x) => x === null).length, 23);
});
