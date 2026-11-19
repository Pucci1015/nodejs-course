// 練習問題8 のテスト。テストごとに新しいスキーマに、必要な列だけの rooms と bookings を作って確かめる
// 使い方（~/dev/room-booking の compose の PostgreSQL が動いていること）: node --test usage-report.test.ts
//   模範解答を試す: MODULE=../solutions/usage-report.ts node --test usage-report.test.ts
import assert from 'node:assert/strict';
import path from 'node:path';
import { mock, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import type pg from 'pg';
import { withTestSchema } from './pg-test.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './usage-report.ts');
const mod: typeof import('./usage-report.ts') = await import(pathToFileURL(file).href);
const { usageReport } = mod;

/** 表を作り、会議室 A（使える）・B（使える）・C（停止）を入れる */
async function setUp(client: pg.ClientBase) {
  await client.query(`
    CREATE TABLE rooms (id integer PRIMARY KEY, name text NOT NULL, active boolean NOT NULL DEFAULT true);
    CREATE TABLE bookings (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      room_id integer NOT NULL REFERENCES rooms (id),
      starts_at timestamptz NOT NULL,
      ends_at timestamptz NOT NULL,
      canceled_at timestamptz
    );
    INSERT INTO rooms (id, name, active) VALUES (1, '会議室A', true), (2, '会議室B', true), (3, '会議室C', false);`);
}

/** 日本の時刻で予約を入れる */
const book = (client: pg.ClientBase, room: number, date: string, s: string, e: string, canceled = false) =>
  client.query('INSERT INTO bookings (room_id, starts_at, ends_at, canceled_at) VALUES ($1, $2, $3, $4)', [
    room,
    `${date}T${s}:00+09:00`,
    `${date}T${e}:00+09:00`,
    canceled ? new Date() : null,
  ]);

test('会議室ごとに、予約の数と分の合計（予約の無い会議室は 0、停止した会議室は出さない）', async () => {
  await withTestSchema(async (client) => {
    await setUp(client);
    await book(client, 1, '2026-12-10', '10:00', '11:00');
    await book(client, 1, '2026-12-10', '13:00', '14:30');
    await book(client, 3, '2026-12-10', '10:00', '11:00');
    assert.deepEqual(await usageReport(client, '2026-12-10'), [
      { roomId: 1, roomName: '会議室A', count: 2, minutes: 150 },
      { roomId: 2, roomName: '会議室B', count: 0, minutes: 0 },
    ]);
  });
});

test('取り消した予約と、ほかの日の予約は数えない（日本の日付で分ける）', async () => {
  await withTestSchema(async (client) => {
    await setUp(client);
    await book(client, 2, '2026-12-10', '08:00', '09:00'); // UTC では前の日の 23:00。日本では 12/10
    await book(client, 2, '2026-12-10', '20:00', '21:00');
    await book(client, 2, '2026-12-10', '15:00', '16:00', true);
    await book(client, 2, '2026-12-09', '20:00', '21:00');
    await book(client, 2, '2026-12-11', '08:00', '08:30');
    assert.deepEqual(await usageReport(client, '2026-12-10'), [
      { roomId: 1, roomName: '会議室A', count: 0, minutes: 0 },
      { roomId: 2, roomName: '会議室B', count: 2, minutes: 120 },
    ]);
  });
});

test('数は JavaScript の number で返す（pg は count・sum を文字列で返すので、そのままではだめ）', async () => {
  await withTestSchema(async (client) => {
    await setUp(client);
    await book(client, 1, '2026-12-10', '09:00', '09:30');
    const [a] = await usageReport(client, '2026-12-10');
    assert.equal(typeof a?.count, 'number');
    assert.equal(typeof a?.minutes, 'number');
  });
});

test('SQL は1回だけ（会議室ごとに SELECT しない）', async () => {
  await withTestSchema(async (client) => {
    await setUp(client);
    // client.query を見張る（元の query も呼ばれる。第11部 第56章の mock.method）
    const query = mock.method(client, 'query');
    await usageReport(client, '2026-12-10');
    assert.equal(query.mock.callCount(), 1);
  });
});

test('型のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
