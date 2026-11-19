// 予約のリポジトリ（src/repositories/pg-bookings.ts）を、本物の PostgreSQL で確かめる（第68章）
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { ConflictError } from '../../src/errors.ts';
import { createPgBookingRepo } from '../../src/repositories/pg-bookings.ts';
import { createPgRoomRepo } from '../../src/repositories/pg-rooms.ts';
import { createTestDb, type TestDb } from '../support/test-db.ts';

let db: TestDb;
let repo: ReturnType<typeof createPgBookingRepo>;
let alice: number;
let bob: number;
let room: number;
const t = (s: string) => new Date(`2026-12-10T${s}:00+09:00`);

before(async () => {
  db = await createTestDb();
  repo = createPgBookingRepo(db.pool);
  alice = await db.newUser();
  bob = await db.newUser();
  room = (await createPgRoomRepo(db.pool).insert({ name: '会議室A', capacity: 6 })).id;
});
after(async () => {
  await db.drop();
});

test('insert と get。会議室の名前も読む', async () => {
  const id = await repo.insert({
    roomId: room,
    userId: alice,
    title: '定例',
    startsAt: t('10:00'),
    endsAt: t('11:00'),
  });
  const b = await repo.get(id);
  assert.equal(b?.roomName, '会議室A');
  assert.equal(b?.startsAt.toISOString(), '2026-12-10T01:00:00.000Z');
  assert.equal(b?.canceledAt, null);
});

test('重なれば ConflictError（23P01 を読み替える）', async () => {
  await assert.rejects(
    repo.insert({ roomId: room, userId: bob, title: 'x', startsAt: t('10:30'), endsAt: t('11:30') }),
    ConflictError,
  );
});

test('listBetween: 範囲に重なるものだけ（端に接するだけのものは入らない）', async () => {
  await repo.insert({ roomId: room, userId: bob, title: '午後', startsAt: t('13:00'), endsAt: t('14:00') });
  const titles = async (from: string, to: string) => (await repo.listBetween(t(from), t(to))).map((b) => b.title);
  assert.deepEqual(await titles('00:00', '23:59'), ['定例', '午後']);
  assert.deepEqual(await titles('11:00', '13:00'), []);
  assert.deepEqual(await titles('10:59', '13:01'), ['定例', '午後']);
});

test('countUpcomingOf・listUpcomingOf: 終わったもの・取り消したものは数えない', async () => {
  const id = await repo.insert({ roomId: room, userId: bob, title: '夕方', startsAt: t('17:00'), endsAt: t('18:00') });
  assert.equal(await repo.countUpcomingOf(bob, t('12:00')), 2);
  assert.equal(await repo.countUpcomingOf(bob, t('14:00')), 1, '14:00 には「午後」は終わっている');
  assert.equal(await repo.cancel(id, bob), true);
  assert.equal(await repo.cancel(id, bob), false, '2回目は false');
  assert.deepEqual(
    (await repo.listUpcomingOf(bob, t('12:00'))).map((b) => b.title),
    ['午後'],
  );
});
