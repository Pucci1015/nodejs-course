// 練習問題8 のテスト。files/migrations/ はアプリの migrations/ のコピー
// 使い方: node --test additive-migration.test.ts
//   模範解答を試す: MODULE=../solutions/additive-migration.ts node --test additive-migration.test.ts
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './additive-migration.ts');
const mod: typeof import('./additive-migration.ts') = await import(pathToFileURL(file).href);
const { checkMigration, REASONS } = mod;

test('アプリのマイグレーション 001〜004 は、どれも足すだけ', async () => {
  const dir = path.join(import.meta.dirname, 'files', 'migrations');
  const names = (await readdir(dir)).filter((n) => n.endsWith('.sql')).toSorted();
  assert.equal(names.length, 4);
  for (const name of names) assert.deepEqual(checkMigration(await readFile(path.join(dir, name), 'utf8')), [], name);
});

test('前の版を壊す書き方を、文の始まりの行で', () => {
  const sql = [
    '-- 005: 題名の列の名前を変える', // 1
    'ALTER TABLE bookings RENAME COLUMN title TO subject;', // 2
    '', // 3
    'alter table rooms', // 4
    '  alter column capacity type bigint;', // 5
    'ALTER TABLE rooms ALTER COLUMN name SET NOT NULL; DROP TABLE reminder_log;', // 6
    'ALTER TABLE bookings ADD COLUMN note text NOT NULL;', // 7
    'ALTER TABLE bookings ALTER COLUMN title TYPE varchar(100), ALTER COLUMN title SET NOT NULL;', // 8
  ].join('\n');
  assert.deepEqual(checkMigration(sql), [
    { line: 2, reason: REASONS.rename },
    { line: 4, reason: REASONS.type },
    { line: 6, reason: REASONS.setNotNull },
    { line: 6, reason: REASONS.drop },
    { line: 7, reason: REASONS.addNotNull },
    { line: 8, reason: REASONS.type },
    { line: 8, reason: REASONS.setNotNull },
  ]);
});

test('問題にしないもの', () => {
  const sql = [
    'CREATE TABLE notes (id integer PRIMARY KEY, body text NOT NULL);',
    "ALTER TABLE bookings ADD COLUMN note text NOT NULL DEFAULT '';",
    'ALTER TABLE bookings ADD COLUMN color text;',
    'DROP INDEX IF EXISTS bookings_user_starts;',
    'ALTER TABLE rooms DROP CONSTRAINT rooms_capacity_check;',
    'CREATE INDEX bookings_room ON bookings (room_id); -- 前の版は DROP TABLE しない',
  ].join('\n');
  assert.deepEqual(checkMigration(sql), []);
});

test("コメントと '…' の中は見ない。; も区切りにしない", () => {
  const sql = [
    '-- DROP TABLE users; は、しない',
    "INSERT INTO notes (id, body) VALUES (1, 'DROP TABLE は; しない'), (2, 'it''s ; RENAME');",
    'DROP TABLE notes;',
  ].join('\n');
  assert.deepEqual(checkMigration(sql), [{ line: 3, reason: REASONS.drop }]);
});

test('型のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
