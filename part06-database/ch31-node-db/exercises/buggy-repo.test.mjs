// 練習問題9 用: buggy-repo.mjs のテスト
// 使い方: node --test buggy-repo.test.mjs
//   模範解答を試す: MODULE=../solutions/repo.mjs node --test buggy-repo.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTaskDb } from './task-db.mjs';

const { createBuggyRepo } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './buggy-repo.mjs')).href);

const now = '2026-11-11T00:00:00.000Z';
const fresh = () => {
  const db = createTaskDb();
  return { db, repo: createBuggyRepo(db) };
};

test("findByTitle: ' を含む題名でも探せる。無ければ null", async () => {
  const { repo } = fresh();
  assert.equal((await repo.findByTitle('本を返す')).id, 2);
  assert.equal((await repo.findByTitle("Let's ストレッチ")).id, 4);
  assert.equal(await repo.findByTitle("Let's"), null);
});

test('insert: タスクの形（dueDate などキャメルケース）で返す', async () => {
  const { repo } = fresh();
  assert.deepEqual(await repo.insert({ title: '花に水をやる', dueDate: '2026-12-01', now }), {
    id: 6,
    title: '花に水をやる',
    status: 'todo',
    dueDate: '2026-12-01',
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    version: 1,
  });
});

test('update: dueDate のようなキャメルケースの名前でも変えられる。知らない名前は例外', async () => {
  const { repo } = fresh();
  const t = await repo.update(2, { dueDate: '2026-12-24', updatedAt: now });
  assert.equal(t.dueDate, '2026-12-24');
  assert.equal(t.updatedAt, now);
  await assert.rejects(repo.update(2, { owner: 'bob' }), /知らない項目/);
});

test('update: expectedVersion が違えば null で、何も変えない', async () => {
  const { repo } = fresh();
  assert.equal(await repo.update(2, { title: 'x', version: 2 }, { expectedVersion: 5 }), null);
  assert.equal((await repo.findByTitle('本を返す')).version, 1);
  assert.equal((await repo.update(2, { title: 'x', version: 2 }, { expectedVersion: 1 })).title, 'x');
});

test('completeAll: 1つでも失敗したら全部取り消し、次の呼び出しも動く', async () => {
  const { db, repo } = fresh();
  await assert.rejects(repo.completeAll([2, 1], now)); // 1 はもう done
  assert.equal(db.isTransaction, false, 'トランザクションが開いたままです');
  assert.equal((await repo.findByTitle('本を返す')).status, 'todo', '2 が done のまま残っています');
  assert.equal(await repo.completeAll([2, 3], now), 2);
});
