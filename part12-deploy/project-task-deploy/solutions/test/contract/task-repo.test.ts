// 追加（第11部）: 同じ約束のテストを、メモリの偽物と PostgreSQL の両方に動かす（第57章 6節）
// PostgreSQL が要る（~/dev/part06 で docker compose up -d --wait）
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createPgTaskRepo } from '../../src/repositories/pg-tasks.ts';
import { createMemoryTaskRepo } from '../support/memory-tasks.ts';
import { createTestDb, type TestDb } from '../support/test-db.ts';
import { fields, taskRepoContract } from './task-repo-contract.ts';

taskRepoContract('メモリ', async () => createMemoryTaskRepo());

let db: TestDb;
before(async () => {
  db = await createTestDb();
});
after(() => db?.drop());

// テストごとに新しいユーザーを作る。PostgreSQL のリポジトリは持ち主で絞るので、新しい人のリポジトリは空
taskRepoContract('PostgreSQL', async () => createPgTaskRepo(db.pool, await db.newUser()));

// PostgreSQL だけの約束（メモリの偽物には持ち主が無いので、契約には入れない）
test('PostgreSQL: 別の人のタスクは、読めず、変えられず、消せない', async () => {
  const alice = createPgTaskRepo(db.pool, await db.newUser());
  const bob = createPgTaskRepo(db.pool, await db.newUser());
  const task = await alice.insert(fields({ title: 'alice のタスク' }));

  assert.equal(await bob.get(task.id), null);
  assert.equal(await bob.update(task.id, { title: '書き換えた' }), null);
  assert.equal(await bob.remove(task.id), false);
  assert.deepEqual((await bob.listPage({ sort: 'createdAt', limit: 10 })).items, []);
  // 同じ題名でも、持ち主が違えばぶつからない
  await bob.insert(fields({ title: 'alice のタスク' }));
  assert.deepEqual(await alice.get(task.id), task);
});
