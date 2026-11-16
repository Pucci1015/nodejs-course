// 練習問題6 のテスト
// 使い方: node --test guards.test.ts
//   模範解答を試す: MODULE=../solutions/guards.ts node --test guards.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './guards.ts');
const m = await import(pathToFileURL(file).href);
/** コメントを除いたソース（ルールを確かめるため） */
const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

const good = { id: 1, title: '牛乳を買う', status: 'todo', dueDate: null, tags: ['買い物'] };

test('isStatus', () => {
  for (const s of ['todo', 'doing', 'done']) assert.equal(m.isStatus(s), true, s);
  for (const s of ['TODO', 'waiting', '', 1, null, undefined, ['todo']]) assert.equal(m.isStatus(s), false, String(s));
});

test('isTask: 正しい形', () => {
  assert.equal(m.isTask(good), true);
  assert.equal(m.isTask({ ...good, dueDate: '2026-11-20', tags: [] }), true);
  assert.equal(m.isTask({ ...good, memo: '余分な項目はあってもよい' }), true);
});

test('isTask: 形が違えば false', () => {
  const bad = [
    null, undefined, 'task', 1, [], [good],
    { ...good, id: '1' }, { ...good, id: 1.5 }, { ...good, id: 0 },
    { ...good, title: 1 }, { ...good, title: '' },
    { ...good, status: 'waiting' },
    { ...good, dueDate: undefined }, { ...good, dueDate: 20261120 },
    { ...good, tags: '買い物' }, { ...good, tags: ['買い物', 1] },
  ];
  for (const v of bad) assert.equal(m.isTask(v), false, JSON.stringify(v));
  const { tags, ...noTags } = good;
  assert.equal(m.isTask(noTags), false, 'tags が無い');
});

test('assertTask: 正しければ何も返さず、違えば TypeError', () => {
  assert.equal(m.assertTask(good), undefined);
  assert.throws(() => m.assertTask({ ...good, status: 'waiting' }), TypeError);
});

test('parseTasks: JSON の配列を読み、タスクの配列を返す', () => {
  assert.deepEqual(m.parseTasks(JSON.stringify([good, { ...good, id: 2 }])), [good, { ...good, id: 2 }]);
  assert.deepEqual(m.parseTasks('[]'), []);
});

test('parseTasks: 配列でなければ TypeError。形の違う要素があれば、何番目かを言って TypeError', () => {
  assert.throws(() => m.parseTasks('{"id":1}'), { name: 'TypeError', message: '配列ではありません' });
  assert.throws(() => m.parseTasks(JSON.stringify([good, good, { id: 3 }])), { name: 'TypeError', message: '3番目の要素がタスクの形ではありません' });
  assert.throws(() => m.parseTasks('[1,'), SyntaxError, 'JSON として読めなければ、JSON.parse の SyntaxError のまま');
});

test('型: tsc のエラーが無い（guards.check.ts の確かめを含む）', () => {
  assert.deepEqual(typeErrors([file, checkFileOf(file)]), []);
});

test('ルール: as と any を使っていない', () => {
  assert.doesNotMatch(code, /\bas\s+(?!const\b)[A-Za-z]/);
  assert.doesNotMatch(code, /\bany\b/);
});
