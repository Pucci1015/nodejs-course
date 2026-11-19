// データベースの制約のテスト（migrations/002_rooms_bookings.sql）。SQL で直接入れて、断られるかを確かめる
// サービスの確かめをすり抜けても（2人が同時に予約しても）、データベースが最後に守る（第67章 5節）
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createTestDb, type TestDb } from '../support/test-db.ts';

let db: TestDb;
let alice: number;
let room: number;
before(async () => {
  db = await createTestDb();
  alice = await db.newUser();
  const { rows } = await db.pool.query<{ id: number }>(
    "INSERT INTO rooms (name, capacity) VALUES ('会議室A', 6) RETURNING id",
  );
  room = rows[0]?.id ?? 0;
});
after(async () => {
  await db.drop();
});

/** 予約を入れる。時刻は日本の時刻で書く */
const book = (start: string, end: string, roomId = room) =>
  db.pool.query<{ id: number }>(
    `INSERT INTO bookings (room_id, user_id, title, starts_at, ends_at)
     VALUES ($1, $2, '定例', $3, $4) RETURNING id`,
    [roomId, alice, `2026-12-10T${start}:00+09:00`, `2026-12-10T${end}:00+09:00`],
  );

/** エラーの code と、制約の名前 */
async function rejects(p: Promise<unknown>) {
  try {
    await p;
  } catch (err) {
    const e = err as { code?: string; constraint?: string };
    return { code: e.code, constraint: e.constraint };
  }
  assert.fail('断られませんでした');
}

test('同じ会議室で時間が重なる予約は、23P01（bookings_no_overlap）で断られる', async () => {
  await book('10:00', '11:00');
  assert.deepEqual(await rejects(book('10:30', '11:30')), { code: '23P01', constraint: 'bookings_no_overlap' });
  assert.deepEqual(await rejects(book('09:00', '12:00')), { code: '23P01', constraint: 'bookings_no_overlap' });
});

test('境目が接するだけなら重ならない（[始まり, 終わり) の範囲）', async () => {
  await book('11:00', '12:00');
  await book('09:30', '10:00');
});

test('ほかの会議室なら、同じ時間でもよい', async () => {
  const { rows } = await db.pool.query<{ id: number }>(
    "INSERT INTO rooms (name, capacity) VALUES ('会議室B', 4) RETURNING id",
  );
  await book('10:00', '11:00', rows[0]?.id);
});

test('取り消した予約とは重なってよい', async () => {
  const { rows } = await book('13:00', '14:00');
  await db.pool.query('UPDATE bookings SET canceled_at = now() WHERE id = $1', [rows[0]?.id]);
  await book('13:00', '14:00');
});

test('CHECK 制約: 終わりが始まりより前・空の題名・定員 0 は 23514', async () => {
  assert.deepEqual(await rejects(book('16:00', '15:00')), { code: '23514', constraint: 'bookings_time_check' });
  assert.deepEqual(
    await rejects(
      db.pool.query(
        "INSERT INTO bookings (room_id, user_id, title, starts_at, ends_at) VALUES ($1, $2, '', now(), now() + interval '1 hour')",
        [room, alice],
      ),
    ),
    { code: '23514', constraint: 'bookings_title_check' },
  );
  assert.deepEqual(await rejects(db.pool.query("INSERT INTO rooms (name, capacity) VALUES ('倉庫', 0)")), {
    code: '23514',
    constraint: 'rooms_capacity_check',
  });
});

test('会議室の名前は重ならない（23505）', async () => {
  assert.deepEqual(await rejects(db.pool.query("INSERT INTO rooms (name, capacity) VALUES ('会議室A', 2)")), {
    code: '23505',
    constraint: 'rooms_name',
  });
});
