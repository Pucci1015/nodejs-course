// 練習問題8 用: buggy-report.mjs のテスト
// 使い方: node --test buggy-report.test.mjs
//   模範解答を試す: MODULE=../solutions/report.mjs node --test buggy-report.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTasksDb } from './tasks-db.mjs';

const r = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './buggy-report.mjs')).href);

test('tasksPerUser: 全員の、タスクの数（無い人は 0）', () => {
  assert.deepEqual(r.tasksPerUser(createTasksDb()), [
    { name: 'alice', n: 3 },
    { name: 'bob', n: 3 },
    { name: 'carol', n: 2 },
    { name: 'dave', n: 0 },
  ]);
});

test('openMinutes: 全員の、終わっていないタスクの minutes の合計（無い人は 0）', () => {
  assert.deepEqual(r.openMinutes(createTasksDb()), [
    { name: 'alice', minutes: 80 },
    { name: 'bob', minutes: 125 },
    { name: 'carol', minutes: 135 },
    { name: 'dave', minutes: 0 },
  ]);
});

test('busyUsers: 終わっていないタスクが min 個以上ある人', () => {
  const db = createTasksDb();
  assert.deepEqual(r.busyUsers(db, 2), ['alice', 'bob', 'carol']);
  assert.deepEqual(r.busyUsers(db, 3), []);
  db.exec(`INSERT INTO tasks (user_id, title, status, minutes) VALUES (1, '新しい用事', 'todo', 15)`);
  assert.deepEqual(r.busyUsers(db, 3), ['alice']);
});

test('taggedMinutes: タグが付いたタスクの minutes の合計（タグが2つでも1回だけ足す）', () => {
  assert.deepEqual(r.taggedMinutes(createTasksDb()), [
    { name: 'alice', minutes: 90 },
    { name: 'bob', minutes: 155 },
    { name: 'carol', minutes: 45 },
  ]);
});
