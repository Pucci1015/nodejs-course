// 練習問題6 用: bulk-tasks.mjs のテスト
// 使い方: node --test bulk-tasks.test.mjs
//   模範解答を試す: MODULE=../solutions/bulk-tasks.mjs node --test bulk-tasks.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTaskDb } from './task-db.mjs';
import { withTransaction } from './with-transaction.mjs';

const { importTasks, completeMany } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './bulk-tasks.mjs')).href);

const now = '2026-11-11T00:00:00.000Z';
const count = (db) => db.prepare('SELECT count(*) AS n FROM tasks').get().n;
const statuses = (db) => db.prepare('SELECT status FROM tasks ORDER BY id').all().map((r) => r.status);

test('importTasks: 全部作って、id の配列を返す', () => {
  const db = createTaskDb();
  assert.deepEqual(importTasks(db, ['窓を拭く', '靴を洗う', '棚を作る'], now), [6, 7, 8]);
  assert.equal(count(db), 8);
});

test('importTasks: 1つでも作れなければ、1つも作らない。何件目かがメッセージに入る', () => {
  const db = createTaskDb();
  assert.throws(() => importTasks(db, ['窓を拭く', '本を返す', '棚を作る'], now), /2 件目/); // 本を返す は、終わっていないタスクにある
  assert.equal(count(db), 5);
  assert.throws(() => importTasks(db, ['窓を拭く', '窓を拭く'], now), /2 件目/); // 同じ題名が2つ
  assert.throws(() => importTasks(db, ['窓を拭く', ''], now), /2 件目/);
  assert.equal(count(db), 5);
  assert.equal(db.isTransaction, false, 'トランザクションが開いたままです');
});

test('completeMany: 全部 done にし、数を返す。completed_at・version も変える', () => {
  const db = createTaskDb();
  assert.equal(completeMany(db, [2, 3], now), 2);
  assert.deepEqual(statuses(db), ['done', 'done', 'done', 'todo', 'todo']);
  assert.deepEqual({ ...db.prepare('SELECT completed_at, updated_at, version FROM tasks WHERE id = 3').get() }, { completed_at: now, updated_at: now, version: 3 });
});

test('completeMany: 無い id・もう done のものがあれば、何も変えずに例外', () => {
  const db = createTaskDb();
  assert.throws(() => completeMany(db, [2, 99, 3], now), Error);
  assert.throws(() => completeMany(db, [2, 1], now), Error); // 1 はもう done
  assert.deepEqual(statuses(db), ['done', 'todo', 'doing', 'todo', 'todo']);
  assert.equal(db.isTransaction, false, 'トランザクションが開いたままです');
});

test('外側のトランザクションの中で呼ぶと、外側が取り消されたら、一緒に取り消される', () => {
  const db = createTaskDb();
  assert.throws(() =>
    withTransaction(db, () => {
      importTasks(db, ['窓を拭く'], now);
      completeMany(db, [2], now);
      throw new Error('外側で失敗');
    }),
  );
  assert.equal(count(db), 5);
  assert.deepEqual(statuses(db), ['done', 'todo', 'doing', 'todo', 'todo']);
});
