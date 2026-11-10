// 練習問題1 用: problem-json.mjs のテスト
// 使い方: node --test problem-json.test.mjs
//   模範解答を試す: MODULE=../solutions/problem-json.mjs node --test problem-json.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './problem-json.mjs')).href);

test('problem: type・title・status を入れる', () => {
  assert.deepEqual(m.problem(404), { type: 'about:blank', title: 'Not Found', status: 404 });
});

test('problem: title はステータスの名前', () => {
  assert.equal(m.problem(409).title, 'Conflict');
  assert.equal(m.problem(500).title, 'Internal Server Error');
});

test('problem: detail と instance があれば入れる', () => {
  assert.deepEqual(m.problem(404, { detail: 'タスク 99 はありません', instance: '/api/tasks/99' }), {
    type: 'about:blank', title: 'Not Found', status: 404, detail: 'タスク 99 はありません', instance: '/api/tasks/99',
  });
});

test('problem: 無いものは、キーごと入れない', () => {
  const body = m.problem(400, { detail: 'x' });
  assert.equal(Object.hasOwn(body, 'instance'), false);
});

test('toErrors: zod の issues を { pointer, detail } の配列にする', () => {
  const issues = [
    { path: ['title'], message: 'title を入力してください' },
    { path: ['tags', 1], message: '空のタグは使えません' },
  ];
  assert.deepEqual(m.toErrors(issues), [
    { pointer: '#/title', detail: 'title を入力してください' },
    { pointer: '#/tags/1', detail: '空のタグは使えません' },
  ]);
});

test('toErrors: 場所の無い間違いは #/。空なら空の配列', () => {
  assert.deepEqual(m.toErrors([{ path: [], message: '知らない項目があります' }]), [{ pointer: '#/', detail: '知らない項目があります' }]);
  assert.deepEqual(m.toErrors([]), []);
});
