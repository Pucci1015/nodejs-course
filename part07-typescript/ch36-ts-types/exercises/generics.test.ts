// 練習問題3 のテスト
// 使い方: node --test generics.test.ts
//   模範解答を試す: MODULE=../solutions/generics.ts node --test generics.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './generics.ts');
const m = await import(pathToFileURL(file).href);
/** コメントを除いたソース（ルールを確かめるため） */
const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

const tasks = [
  { id: 1, title: '牛乳を買う', status: 'todo' },
  { id: 2, title: '本を返す', status: 'done' },
  { id: 3, title: '掃除', status: 'todo' },
];

test('last: 最後の要素。空なら undefined', () => {
  assert.equal(m.last([1, 2, 3]), 3);
  assert.equal(m.last([]), undefined);
});

test('pluck: 各要素の key の値を並べた配列', () => {
  assert.deepEqual(m.pluck(tasks, 'title'), ['牛乳を買う', '本を返す', '掃除']);
  assert.deepEqual(m.pluck([], 'id'), []);
});

test('groupBy: keyOf の結果ごとに分けた Map。順番は最初に出てきた順', () => {
  const g = m.groupBy(tasks, (t: { status: string }) => t.status);
  assert.ok(g instanceof Map);
  assert.deepEqual([...g.keys()], ['todo', 'done']);
  assert.deepEqual(g.get('todo'), [tasks[0], tasks[2]]);
  assert.deepEqual(g.get('done'), [tasks[1]]);
});

test('indexBy: key の値から要素を引く Map。同じ値があれば後のもの', () => {
  const i = m.indexBy(tasks, 'id');
  assert.ok(i instanceof Map);
  assert.equal(i.get(2), tasks[1]);
  assert.equal(i.size, 3);
  assert.equal(m.indexBy([{ k: 'a', n: 1 }, { k: 'a', n: 2 }], 'k').get('a').n, 2);
});

test('chunk: size 個ずつに分ける。size が 1 より小さいか整数でなければ RangeError', () => {
  assert.deepEqual(m.chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(m.chunk([], 3), []);
  assert.throws(() => m.chunk([1], 0), RangeError);
  assert.throws(() => m.chunk([1], 1.5), RangeError);
});

test('型: tsc のエラーが無い（generics.check.ts の確かめを含む）', () => {
  assert.deepEqual(typeErrors([file, checkFileOf(file)]), []);
});

test('ルール: as と any を使っていない', () => {
  assert.doesNotMatch(code, /\bas\s+(?!const\b)[A-Za-z]/);
  assert.doesNotMatch(code, /\bany\b/);
});
