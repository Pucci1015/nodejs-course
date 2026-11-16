// 練習問題2 用: group-queries.mjs のテスト
// 使い方: node --test group-queries.test.mjs
//   模範解答を試す: MODULE=../solutions/group-queries.mjs node --test group-queries.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTasksDb } from './tasks-db.mjs';

const q = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './group-queries.mjs')).href);
const run = (sql, db = createTasksDb()) => db.prepare(sql).all().map((row) => ({ ...row }));

test('countByUser: { name, n } を、人の id の順に', () => {
  assert.deepEqual(run(q.countByUser), [
    { name: 'alice', n: 3 },
    { name: 'bob', n: 3 },
    { name: 'carol', n: 2 },
  ]);
});

test('minutesByUser: 終わっていないタスクの minutes の合計 { name, minutes }。タスクの無い人も 0', () => {
  assert.deepEqual(run(q.minutesByUser), [
    { name: 'alice', minutes: 80 },
    { name: 'bob', minutes: 125 },
    { name: 'carol', minutes: 135 },
    { name: 'dave', minutes: 0 },
  ]);
});

test('minutesByUser: 全部終わった人も 0 になる（NULL ではない）', () => {
  const db = createTasksDb();
  db.exec(`UPDATE tasks SET status = 'done' WHERE user_id = 3`);
  assert.deepEqual(run(q.minutesByUser, db).find((r) => r.name === 'carol'), { name: 'carol', minutes: 0 });
});

test('popularTags: 2 つ以上のタスクに付いたタグ { name, n } を、n の多い順（同じなら name の順）に', () => {
  assert.deepEqual(run(q.popularTags), [
    { name: '家', n: 4 },
    { name: '急ぎ', n: 2 },
  ]);
});
