// 練習問題5 用: complete-task.mjs のテスト
// 使い方: node --test complete-task.test.mjs
//   模範解答を試す: MODULE=../solutions/complete-task.mjs node --test complete-task.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTasksDb } from './tasks-db.mjs';

const { EVENTS_SQL, completeTask } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './complete-task.mjs')).href);

function freshDb() {
  const db = createTasksDb();
  db.exec(EVENTS_SQL);
  return db;
}
const task = (db, id) => ({ ...db.prepare('SELECT status, version FROM tasks WHERE id = ?').get(id) });
const events = (db) => db.prepare('SELECT task_id, kind, at FROM task_events ORDER BY id').all().map((r) => ({ ...r }));

test('done にし、version を 1 増やし、task_events に completed を1行足す', () => {
  const db = freshDb();
  completeTask(db, 2, '2026-11-11T09:00:00Z');
  assert.deepEqual(task(db, 2), { status: 'done', version: 2 });
  assert.deepEqual(events(db), [{ task_id: 2, kind: 'completed', at: '2026-11-11T09:00:00Z' }]);
});

test('無いタスクは例外を投げ、何も変えない', () => {
  const db = freshDb();
  assert.throws(() => completeTask(db, 99, '2026-11-11T09:00:00Z'));
  assert.deepEqual(events(db), []);
});

test('もう終わっているタスクは例外を投げ、version も記録も変えない', () => {
  const db = freshDb();
  assert.throws(() => completeTask(db, 1, '2026-11-11T09:00:00Z'));
  assert.deepEqual(task(db, 1), { status: 'done', version: 1 });
  assert.deepEqual(events(db), []);
});

test('記録が書けなかったら、タスクも done にならない（全部か、何もしないか）', () => {
  const db = freshDb();
  db.exec('DROP TABLE task_events'); // 記録のテーブルを消して、2つ目の書き込みを失敗させる
  assert.throws(() => completeTask(db, 3, '2026-11-11T09:00:00Z'));
  assert.deepEqual(task(db, 3), { status: 'doing', version: 1 });
});

test('失敗した後でも、次の呼び出しは成功する（トランザクションが開いたまま残らない）', () => {
  const db = freshDb();
  assert.throws(() => completeTask(db, 99, 'x'));
  completeTask(db, 2, '2026-11-11T09:00:00Z');
  assert.equal(task(db, 2).status, 'done');
  assert.equal(db.isTransaction, false);
});
