// 練習問題3 のテスト: 同じ約束のテストを、PostgreSQL（本物）と、あなたの偽物の両方に動かす
// 使い方: node --test memory-users.test.ts（PostgreSQL 5433 が要る）
//   模範解答を試す: MODULE=../solutions/memory-users.ts node --test memory-users.test.ts
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createPgUsers, USERS_SQL } from './pg-users.ts';
import { createTestDb, type TestDb } from './test-db.ts';
import { typeErrors } from './typecheck.ts';
import { usersContract } from './users-contract.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './memory-users.ts');
const { createMemoryUsers }: typeof import('./memory-users.ts') = await import(pathToFileURL(file).href);

// 本物で、約束のテストそのものが正しいことを確かめる
let db: TestDb;
before(async () => {
  db = await createTestDb(USERS_SQL);
});
after(() => db?.drop());
usersContract('PostgreSQL', async () => {
  await db.pool.query('TRUNCATE users RESTART IDENTITY');
  return createPgUsers(db.pool);
});

// 同じ約束を、あなたの偽物に
usersContract('メモリ', async () => createMemoryUsers());

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
