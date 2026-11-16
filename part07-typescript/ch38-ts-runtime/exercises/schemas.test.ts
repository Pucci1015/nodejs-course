// 練習問題1 のテスト
// 使い方: node --test schemas.test.ts
//   模範解答を試す: MODULE=../solutions/schemas.ts node --test schemas.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './schemas.ts');
const m = await import(pathToFileURL(file).href);
/** コメントを除いたソース（ルールを確かめるため） */
const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

/** safeParse の間違いの場所（path）の一覧 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const paths = (schema: any, value: unknown): unknown[][] => {
  const r = schema.safeParse(value);
  return r.success ? [] : r.error.issues.map((i: { path: unknown[] }) => i.path);
};

const goodTask = { id: 1, title: '牛乳を買う', status: 'todo', dueDate: null, tags: ['家'], createdAt: '2026-11-11T09:00:00.000Z' };

test('Task', () => {
  assert.deepEqual(m.Task.parse(goodTask), goodTask);
  assert.deepEqual(m.Task.parse({ ...goodTask, dueDate: '2026-11-20', extra: 1 }), { ...goodTask, dueDate: '2026-11-20' }, '知らない項目は取り除く');
  assert.deepEqual(paths(m.Task, { ...goodTask, id: '1' }), [['id']]);
  assert.deepEqual(paths(m.Task, { ...goodTask, id: 0, title: '' }), [['id'], ['title']]);
  assert.deepEqual(paths(m.Task, { ...goodTask, dueDate: '2026/11/20', createdAt: '2026-11-11' }), [['dueDate'], ['createdAt']]);
  assert.deepEqual(paths(m.Task, { ...goodTask, status: 'waiting', tags: ['a', 1] }), [['status'], ['tags', 1]]);
  assert.deepEqual(paths(m.Status, 'done'), []);
});

test('NewTask: 省略したものは決まりの値。前後の空白を除く', () => {
  assert.deepEqual(m.NewTask.parse({ title: '  本を返す ' }), { title: '本を返す', status: 'todo', dueDate: null, tags: [] });
  assert.deepEqual(m.NewTask.parse({ title: 'a', status: 'doing', dueDate: '2026-11-20', tags: [' 家 ', '急ぎ'] }), {
    title: 'a', status: 'doing', dueDate: '2026-11-20', tags: ['家', '急ぎ'],
  });
});

test('NewTask: 間違い', () => {
  assert.deepEqual(paths(m.NewTask, {}), [['title']]);
  assert.deepEqual(paths(m.NewTask, { title: '   ' }), [['title']], '空白だけは空と同じ');
  assert.deepEqual(paths(m.NewTask, { title: 'あ'.repeat(101) }), [['title']]);
  assert.deepEqual(paths(m.NewTask, { title: 'a', tags: ['a', ' '] }), [['tags', 1]]);
  assert.deepEqual(paths(m.NewTask, { title: 'a', tags: ['あ'.repeat(21)] }), [['tags', 0]]);
  assert.deepEqual(paths(m.NewTask, { title: 'a', tags: ['1', '2', '3', '4', '5', '6'] }), [['tags']]);
  assert.deepEqual(paths(m.NewTask, { title: 'a', id: 5 }), [[]], '知らない項目は間違い（path は []）');
});

test('TaskPatch', () => {
  assert.deepEqual(m.TaskPatch.parse({ dueDate: null }), { dueDate: null });
  assert.deepEqual(m.TaskPatch.parse({ title: ' b ' }), { title: 'b' });
  assert.deepEqual(paths(m.TaskPatch, { title: null }), [['title']]);
  assert.deepEqual(paths(m.TaskPatch, { title: 'a', version: 2 }), [[]]);
  const r = m.TaskPatch.safeParse({});
  assert.equal(r.success, false);
  assert.equal(r.error.issues[0].message, '変える項目が1つもありません');
});

test('型: tsc のエラーが無い（schemas.check.ts の確かめを含む）', () => {
  assert.deepEqual(typeErrors([file, checkFileOf(file)]), []);
});

test('ルール: 型はスキーマから作る。any と as を使っていない', () => {
  assert.match(code, /z\.infer|z\.output/);
  assert.match(code, /z\.input/);
  assert.doesNotMatch(code, /\bany\b/);
  assert.doesNotMatch(code, /\bas\s+(?!const\b)[A-Za-z]/);
});
