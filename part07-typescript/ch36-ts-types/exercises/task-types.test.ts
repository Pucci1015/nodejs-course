// 練習問題5 のテスト
// 使い方: node --test task-types.test.ts
//   模範解答を試す: MODULE=../solutions/task-types.ts node --test task-types.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './task-types.ts');
const m = await import(pathToFileURL(file).href);
/** コメントを除いたソース（ルールを確かめるため） */
const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

const task = {
  id: 1,
  title: '牛乳を買う',
  status: 'todo',
  dueDate: null,
  tags: ['買い物'],
  createdAt: '2026-11-10T09:00:00.000Z',
  updatedAt: '2026-11-10T09:00:00.000Z',
  version: 1,
};
const NOW = '2026-11-11T12:00:00.000Z';

test('applyPatch: 渡した項目だけ変え、updatedAt を now に、version を 1 増やす', () => {
  assert.deepEqual(m.applyPatch(task, { status: 'doing', dueDate: '2026-11-20' }, NOW), {
    ...task,
    status: 'doing',
    dueDate: '2026-11-20',
    updatedAt: NOW,
    version: 2,
  });
  assert.equal(task.status, 'todo', '元のタスクは変えない');
});

test('applyPatch: 値が undefined の項目は無視する（null は「締め切りを消す」なので使う）', () => {
  const t2 = m.applyPatch({ ...task, dueDate: '2026-11-20' }, { title: undefined, dueDate: null }, NOW);
  assert.equal(t2.title, '牛乳を買う');
  assert.equal(t2.dueDate, null);
});

test('applyPatch: 空の patch でも updatedAt と version は変わる', () => {
  assert.deepEqual(m.applyPatch(task, {}, NOW), { ...task, updatedAt: NOW, version: 2 });
});

test('toSummary: id・title・status の3つだけ', () => {
  assert.deepEqual(m.toSummary(task), { id: 1, title: '牛乳を買う', status: 'todo' });
});

test('countStatuses: 状態ごとの数', () => {
  assert.deepEqual(m.countStatuses([task, { ...task, id: 2, status: 'done' }, { ...task, id: 3 }]), { todo: 2, doing: 0, done: 1 });
  assert.deepEqual(m.countStatuses([]), { todo: 0, doing: 0, done: 0 });
});

test('型: tsc のエラーが無い（task-types.check.ts の確かめを含む）', () => {
  assert.deepEqual(typeErrors([file, checkFileOf(file)]), []);
});

test('ルール: 4つの型を、ユーティリティ型で Task から作っている', () => {
  assert.match(code, /type\s+NewTask\s*=\s*(Omit|Pick)</);
  assert.match(code, /type\s+TaskPatch\s*=\s*Partial</);
  assert.match(code, /type\s+TaskSummary\s*=\s*Pick</);
  assert.match(code, /type\s+StatusCounts\s*=\s*Record</);
});
