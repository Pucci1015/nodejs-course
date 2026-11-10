// 練習問題2 用: task-schema.mjs のテスト
// 使い方: node --test task-schema.test.mjs
//   模範解答を試す: MODULE=../solutions/task-schema.mjs node --test task-schema.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { CreateTask } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './task-schema.mjs')).href);

const ok = (input) => {
  const r = CreateTask.safeParse(input);
  assert.equal(r.success, true, JSON.stringify(r.error?.issues));
  return r.data;
};
const ng = (input) => {
  const r = CreateTask.safeParse(input);
  assert.equal(r.success, false, JSON.stringify(input));
  return r.error.issues.map((i) => i.path.join('.'));
};

test('title だけでよい。status は todo、tags は [] になる', () => {
  assert.deepEqual(ok({ title: '牛乳を買う' }), { title: '牛乳を買う', status: 'todo', tags: [] });
});

test('title の前後の空白を取る。全部そろったものも通す', () => {
  assert.deepEqual(ok({ title: '  卵 ', status: 'doing', dueDate: '2026-12-01', tags: ['買い物'] }),
    { title: '卵', status: 'doing', dueDate: '2026-12-01', tags: ['買い物'] });
});

test('title が無い・空白だけ・文字列でない・101 文字以上は間違い', () => {
  for (const title of [undefined, '   ', 1, 'あ'.repeat(101)]) assert.deepEqual(ng({ title }), ['title'], String(title));
  ok({ title: 'あ'.repeat(100) });
});

test('title が空のときの文は「title を入力してください」', () => {
  const r = CreateTask.safeParse({ title: ' ' });
  assert.equal(r.error.issues[0].message, 'title を入力してください');
});

test('status は todo・doing・done だけ。dueDate は YYYY-MM-DD の日付', () => {
  assert.deepEqual(ng({ title: 'a', status: 'later' }), ['status']);
  assert.deepEqual(ng({ title: 'a', dueDate: '明日' }), ['dueDate']);
  assert.deepEqual(ng({ title: 'a', dueDate: '2026-13-01' }), ['dueDate']);
});

test('tags は空でない文字列を 5 個まで。知らない項目は間違い', () => {
  assert.deepEqual(ng({ title: 'a', tags: ['x', ' '] }), ['tags.1']);
  assert.deepEqual(ng({ title: 'a', tags: ['1', '2', '3', '4', '5', '6'] }), ['tags']);
  assert.equal(ng({ title: 'a', owner: 'alice' }).length, 1);
  ng('文字列');
});
