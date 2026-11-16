// 練習問題1 用: join-queries.mjs のテスト
// 使い方: node --test join-queries.test.mjs
//   模範解答を試す: MODULE=../solutions/join-queries.mjs node --test join-queries.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTasksDb } from './tasks-db.mjs';

const q = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './join-queries.mjs')).href);
const run = (sql) => createTasksDb().prepare(sql).all().map((row) => ({ ...row }));

test('openWithOwner: 終わっていないタスクの title と持ち主の name を、id の順に', () => {
  assert.deepEqual(run(q.openWithOwner), [
    { title: '本を返す', name: 'alice' },
    { title: '部屋の掃除', name: 'alice' },
    { title: '報告書を書く', name: 'bob' },
    { title: '歯医者の予約', name: 'bob' },
    { title: '旅行の計画', name: 'carol' },
    { title: '年賀状', name: 'carol' },
  ]);
});

test('usersWithoutTasks: タスクを1つも持っていない人（dave だけ）', () => {
  assert.deepEqual(run(q.usersWithoutTasks), [{ name: 'dave' }]);
});

test('usersWithoutTasks: carol のタスクを全部消すと、carol も出る', () => {
  const db = createTasksDb();
  db.exec('DELETE FROM tasks WHERE user_id = 3');
  const names = db.prepare(q.usersWithoutTasks).all().map((r) => r.name).sort();
  assert.deepEqual(names, ['carol', 'dave']);
});

test('tagsOfTask4: タスク 4 のタグの name を、name の順に', () => {
  assert.deepEqual(run(q.tagsOfTask4), [{ name: '仕事' }, { name: '急ぎ' }]);
});
