// 練習問題2 のテスト
// 使い方: node --test task.test.ts
//   模範解答を試す: MODULE=../solutions/task.ts node --test task.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './task.ts');
const m = await import(pathToFileURL(file).href);

test('createTask: done は false。dueDate は渡したときだけ入る', () => {
  assert.deepEqual(m.createTask(1, '牛乳を買う'), { id: 1, title: '牛乳を買う', done: false });
  assert.deepEqual(m.createTask(2, '本を返す', '2026-11-20'), { id: 2, title: '本を返す', done: false, dueDate: '2026-11-20' });
  assert.equal(Object.hasOwn(m.createTask(3, 'x'), 'dueDate'), false, 'dueDate: undefined も入れない');
});

test('isOverdue: 終わっていなくて、締め切りが today より前なら true', () => {
  const t = m.createTask(1, 'a', '2026-11-10');
  assert.equal(m.isOverdue(t, '2026-11-11'), true);
  assert.equal(m.isOverdue(t, '2026-11-10'), false, '当日はまだ過ぎていない');
  assert.equal(m.isOverdue(t, '2026-11-09'), false);
  assert.equal(m.isOverdue({ ...t, done: true }, '2026-12-01'), false, '終わったものは過ぎていない');
  assert.equal(m.isOverdue(m.createTask(2, 'b'), '2026-12-01'), false, '締め切りが無ければ false');
});

test('toggle: done を反対にした「新しい」タスクを返す（元のタスクは変えない）', () => {
  const t = m.createTask(1, 'a', '2026-11-10');
  const t2 = m.toggle(t);
  assert.deepEqual(t2, { id: 1, title: 'a', done: true, dueDate: '2026-11-10' });
  assert.equal(t.done, false, '元のタスクは変わらない');
  assert.notEqual(t2, t);
  assert.equal(m.toggle(t2).done, false);
});

test('型: tsc のエラーが無い（task.check.ts の確かめを含む）', () => {
  assert.deepEqual(typeErrors([file, checkFileOf(file)]), []);
});
