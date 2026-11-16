// 練習問題5 用: task-repo.mjs のテスト
// 使い方: node --test task-repo.test.mjs
//   模範解答を試す: MODULE=../solutions/task-repo.mjs node --test task-repo.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTaskDb } from './task-db.mjs';

const { createSqliteTaskRepo } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './task-repo.mjs')).href);

const now = '2026-11-11T00:00:00.000Z';
const fresh = () => createSqliteTaskRepo(createTaskDb());

test('本文と同じ5つのメソッドは、そのまま動く', async () => {
  const repo = fresh();
  const t = await repo.insert({ title: '花に水をやる', status: 'todo', dueDate: null, createdAt: now, updatedAt: now, completedAt: null, version: 1 });
  assert.equal(t.id, 6);
  assert.equal((await repo.update(6, { title: 'x', version: 2 }, { expectedVersion: 1 })).version, 2);
  assert.equal(await repo.update(6, { title: 'y' }, { expectedVersion: 1 }), null);
  assert.equal(await repo.remove(6), true);
  assert.equal((await repo.list()).length, 5);
});

test('findByStatus: タスク（dueDate などキャメルケースの形）を id の順に', async () => {
  const repo = fresh();
  const todo = await repo.findByStatus('todo');
  assert.deepEqual(todo.map((t) => t.id), [2, 4, 5]);
  assert.deepEqual(todo[0], {
    id: 2,
    title: '本を返す',
    status: 'todo',
    dueDate: '2026-11-12',
    createdAt: '2026-11-02T00:00:00.000Z',
    updatedAt: '2026-11-02T00:00:00.000Z',
    completedAt: null,
    version: 1,
  });
  assert.deepEqual(await repo.findByStatus('paused'), []);
});

test('countByStatus: { todo, doing, done }。無い status も 0', async () => {
  const repo = fresh();
  assert.deepEqual(await repo.countByStatus(), { todo: 3, doing: 1, done: 1 });
  await repo.remove(3);
  assert.deepEqual(await repo.countByStatus(), { todo: 3, doing: 0, done: 1 });
});

test('listPage: id の順に limit 個ずつ。最後のページの nextAfter は null', async () => {
  const repo = fresh();
  const p1 = await repo.listPage({ limit: 2 });
  assert.deepEqual(p1.items.map((t) => t.id), [1, 2]);
  assert.equal(p1.items[0].completedAt, '2026-11-01T03:00:00.000Z', 'items はタスクの形（キャメルケース）');
  assert.equal(p1.nextAfter, 2);
  const p2 = await repo.listPage({ limit: 2, after: p1.nextAfter });
  assert.deepEqual(p2.items.map((t) => t.id), [3, 4]);
  const p3 = await repo.listPage({ limit: 2, after: p2.nextAfter });
  assert.deepEqual(p3, { items: [(await repo.get(5))], nextAfter: null });
});

test('listPage: ちょうど割り切れるときも、空のページを作らない', async () => {
  const repo = fresh();
  const p = await repo.listPage({ limit: 5 });
  assert.equal(p.items.length, 5);
  assert.equal(p.nextAfter, null);
});
