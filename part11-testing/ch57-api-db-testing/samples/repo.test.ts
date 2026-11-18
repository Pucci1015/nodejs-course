// 第57章 5・6節: 同じ約束のテストを、メモリの偽物と PostgreSQL の両方に動かす
// 使い方: node --test samples/repo.test.ts（PostgreSQL 5433 が要る）
import { after, before } from 'node:test';
import { createMemoryRepo } from './memory-repo.ts';
import { createPgRepo } from './pg-repo.ts';
import { repoContract } from './repo-contract.ts';
import { createTestDb, type TestDb } from './test-db.ts';

repoContract('メモリ', async () => createMemoryRepo());

let db: TestDb;
before(async () => {
  db = await createTestDb();
});
after(() => db?.drop());

repoContract('PostgreSQL', async () => {
  // テストごとに表を空にする。RESTART IDENTITY で id も 1 から
  await db.pool.query('TRUNCATE tasks RESTART IDENTITY');
  return createPgRepo(db.pool);
});
