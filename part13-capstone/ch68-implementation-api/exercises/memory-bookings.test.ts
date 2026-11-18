// 練習問題5 のテスト。本文の test/db/repositories.test.ts と同じことを、メモリの実装で確かめる
// 使い方: node --test memory-bookings.test.ts
//   模範解答を試す: MODULE=../solutions/memory-bookings.ts node --test memory-bookings.test.ts
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { ConflictError } from './errors.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './memory-bookings.ts');
const mod: typeof import('./memory-bookings.ts') = await import(pathToFileURL(file).href);
const { createMemoryBookingRepo } = mod;

const jst = (hm: string, date = '2026-12-10') => new Date(`${date}T${hm}:00+09:00`);
const newRepo = () =>
  createMemoryBookingRepo(
    new Map([
      [1, '会議室A'],
      [2, '会議室B'],
    ]),
  );
const input = (roomId: number, s: string, e: string, userId = 1, title = '定例') => ({
  roomId,
  userId,
  title,
  startsAt: jst(s),
  endsAt: jst(e),
});

test('insert は 1 から順に id を返し、get で読める（roomName と canceledAt: null）', async () => {
  const repo = newRepo();
  assert.equal(await repo.insert(input(1, '10:00', '11:00')), 1);
  assert.equal(await repo.insert(input(2, '10:00', '11:00')), 2);
  assert.deepEqual(await repo.get(1), {
    id: 1,
    roomId: 1,
    roomName: '会議室A',
    userId: 1,
    title: '定例',
    startsAt: jst('10:00'),
    endsAt: jst('11:00'),
    canceledAt: null,
  });
  assert.equal(await repo.get(99), null);
});

test('同じ会議室で重なれば ConflictError。接するだけ・取り消したものとならよい', async () => {
  const repo = newRepo();
  await repo.insert(input(1, '10:00', '11:00'));
  await assert.rejects(repo.insert(input(1, '10:30', '11:30')), ConflictError);
  await repo.insert(input(1, '11:00', '12:00'));
  assert.equal(await repo.cancel(1, 1), true);
  await repo.insert(input(1, '10:30', '11:00'));
});

test('cancel: 2回目と、無い id は false。取り消すと canceledAt が入る', async () => {
  const repo = newRepo();
  await repo.insert(input(1, '10:00', '11:00'));
  assert.equal(await repo.cancel(1, 9), true);
  assert.equal(await repo.cancel(1, 9), false);
  assert.equal(await repo.cancel(2, 9), false);
  assert.ok((await repo.get(1))?.canceledAt instanceof Date);
});

test('listBetween: 重なるもの・取り消していないものを、始まりの順（同じなら会議室の順）に', async () => {
  const repo = newRepo();
  await repo.insert(input(2, '13:00', '14:00', 1, 'B13'));
  await repo.insert(input(2, '10:00', '11:00', 1, 'B10'));
  await repo.insert(input(1, '10:00', '11:00', 1, 'A10'));
  await repo.insert(input(1, '15:00', '16:00', 1, '消す'));
  await repo.cancel(4, 1);
  const titles = async (from: Date, to: Date) => (await repo.listBetween(from, to)).map((b) => b.title);
  assert.deepEqual(await titles(jst('00:00'), jst('00:00', '2026-12-11')), ['A10', 'B10', 'B13']);
  assert.deepEqual(await titles(jst('11:00'), jst('13:00')), []); // 接するだけは入らない
  assert.deepEqual(await titles(jst('10:59'), jst('13:01')), ['A10', 'B10', 'B13']);
});

test('listUpcomingOf・countUpcomingOf: その人の、終わっていない・取り消していないもの', async () => {
  const repo = newRepo();
  await repo.insert(input(1, '09:00', '10:00', 1, '終わった'));
  await repo.insert(input(1, '13:00', '14:00', 1, '午後'));
  await repo.insert(input(2, '10:00', '11:00', 1, '使用中'));
  await repo.insert(input(2, '15:00', '16:00', 2, 'bob'));
  await repo.insert(input(1, '16:00', '17:00', 1, '消す'));
  await repo.cancel(5, 1);
  const now = jst('10:30');
  assert.deepEqual(
    (await repo.listUpcomingOf(1, now)).map((b) => b.title),
    ['使用中', '午後'],
  );
  assert.equal(await repo.countUpcomingOf(1, now), 2);
  assert.equal(await repo.countUpcomingOf(2, now), 1);
});

test('返したものを書き換えても、中の予約は変わらない', async () => {
  const repo = newRepo();
  await repo.insert(input(1, '10:00', '11:00'));
  const got = await repo.get(1);
  if (got === null) throw new Error('無い');
  got.title = '書き換えた';
  got.startsAt.setTime(0);
  assert.equal((await repo.get(1))?.title, '定例');
  assert.deepEqual((await repo.get(1))?.startsAt, jst('10:00'));
});

test('tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
