// 練習問題7 用: safe-update.mjs のテスト
// 使い方: node --test safe-update.test.mjs
//   模範解答を試す: MODULE=../solutions/safe-update.mjs node --test safe-update.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTasksDb } from './tasks-db.mjs';

const { KEYS_SQL, renameTask, createTaskOnce } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './safe-update.mjs')).href);

function freshDb() {
  const db = createTasksDb();
  db.exec(KEYS_SQL);
  return db;
}
const count = (db) => db.prepare('SELECT count(*) AS n FROM tasks').get().n;

test('renameTask: version が合えば変えて、version を 1 増やした { id, title, version } を返す', () => {
  const db = freshDb();
  assert.deepEqual(renameTask(db, 2, '図書館に本を返す', 1), { ok: true, task: { id: 2, title: '図書館に本を返す', version: 2 } });
});

test('renameTask: 古い version なら conflict で、何も変えない', () => {
  const db = freshDb();
  renameTask(db, 2, 'A さんの題名', 1);
  assert.deepEqual(renameTask(db, 2, 'B さんの題名', 1), { ok: false, reason: 'conflict' });
  assert.equal(db.prepare('SELECT title FROM tasks WHERE id = 2').get().title, 'A さんの題名');
});

test('renameTask: 無いタスクは not_found', () => {
  assert.deepEqual(renameTask(freshDb(), 99, 'x', 1), { ok: false, reason: 'not_found' });
});

test('createTaskOnce: 初めてのキーなら作って { id, created: true }', () => {
  const db = freshDb();
  assert.deepEqual(createTaskOnce(db, 'key-1', { userId: 4, title: '散歩', minutes: 30 }), { id: 9, created: true });
  assert.equal(db.prepare('SELECT title FROM tasks WHERE id = 9').get().title, '散歩');
});

test('createTaskOnce: 同じキーの2回目は作らず、1回目の id と created: false', () => {
  const db = freshDb();
  createTaskOnce(db, 'key-1', { userId: 4, title: '散歩', minutes: 30 });
  assert.deepEqual(createTaskOnce(db, 'key-1', { userId: 4, title: '散歩', minutes: 30 }), { id: 9, created: false });
  assert.equal(count(db), 9);
  assert.deepEqual(createTaskOnce(db, 'key-2', { userId: 4, title: '散歩', minutes: 30 }), { id: 10, created: true });
});

test('createTaskOnce: タスクが作れなかったら、キーも残らない（次に同じキーで作れる）', () => {
  const db = freshDb();
  assert.throws(() => createTaskOnce(db, 'key-1', { userId: 4, title: '散歩', minutes: 0 })); // minutes > 0 の CHECK
  assert.equal(db.prepare('SELECT count(*) AS n FROM idempotency_keys').get().n, 0);
  assert.deepEqual(createTaskOnce(db, 'key-1', { userId: 4, title: '散歩', minutes: 30 }), { id: 9, created: true });
  assert.equal(db.isTransaction, false);
});
