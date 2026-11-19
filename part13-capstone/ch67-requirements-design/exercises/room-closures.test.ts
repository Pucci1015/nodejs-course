// 練習問題7 のテスト（PostgreSQL が要る。~/dev/room-booking で docker compose up -d --wait）
// 使い方: node --test room-closures.test.ts
//   模範解答を試す: SQL=../solutions/room-closures.sql node --test room-closures.test.ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import type pg from 'pg';
import { pgError, withTestSchema } from './pg-test.ts';

const sql = await readFile(path.resolve(import.meta.dirname, process.env.SQL ?? './room-closures.sql'), 'utf8');

/** 表を作り、日本の時刻で閉める時間を入れる関数を渡す */
async function withClosures(
  fn: (
    close: (room: number, s: string, e: string, reason?: string) => Promise<unknown>,
    c: pg.ClientBase,
  ) => Promise<void>,
) {
  await withTestSchema(async (client) => {
    await client.query('CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public');
    await client.query(sql);
    const close = (room: number, s: string, e: string, reason = '点検') =>
      client.query(`INSERT INTO room_closures (room_id, reason, during) VALUES ($1, $2, tstzrange($3, $4))`, [
        room,
        reason,
        `2026-12-10T${s}:00+09:00`,
        `2026-12-10T${e}:00+09:00`,
      ]);
    await fn(close, client);
  });
}

test('表があり、id は自動で振られる', async () => {
  await withClosures(async (close, client) => {
    await close(1, '10:00', '12:00');
    const { rows } = await client.query<{
      id: number;
      room_id: number;
      reason: string;
    }>('SELECT id, room_id, reason FROM room_closures');
    assert.deepEqual(rows, [{ id: 1, room_id: 1, reason: '点検' }]);
  });
});

test('同じ会議室で重なる時間は 23P01（room_closures_no_overlap）', async () => {
  await withClosures(async (close) => {
    await close(1, '10:00', '12:00');
    assert.deepEqual(await pgError(close(1, '11:00', '13:00')), {
      code: '23P01',
      constraint: 'room_closures_no_overlap',
    });
  });
});

test('接するだけ・ほかの会議室なら入る', async () => {
  await withClosures(async (close) => {
    await close(1, '10:00', '12:00');
    assert.equal(await pgError(close(1, '12:00', '13:00')), null);
    assert.equal(await pgError(close(2, '10:00', '12:00')), null);
  });
});

test('空の時間（始まり = 終わり）は 23514（room_closures_during_check）', async () => {
  await withClosures(async (close) => {
    assert.deepEqual(await pgError(close(1, '10:00', '10:00')), {
      code: '23514',
      constraint: 'room_closures_during_check',
    });
  });
});

test('理由は 1〜100 文字（room_closures_reason_check）。NULL もだめ', async () => {
  await withClosures(async (close, client) => {
    assert.deepEqual(await pgError(close(1, '10:00', '11:00', '')), {
      code: '23514',
      constraint: 'room_closures_reason_check',
    });
    assert.deepEqual(await pgError(close(1, '10:00', '11:00', 'あ'.repeat(101))), {
      code: '23514',
      constraint: 'room_closures_reason_check',
    });
    const r = await pgError(
      client.query(
        `INSERT INTO room_closures (room_id, during) VALUES (1, tstzrange(now(), now() + interval '1 hour'))`,
      ),
    );
    assert.equal(r?.code, '23502'); // NOT NULL
  });
});
