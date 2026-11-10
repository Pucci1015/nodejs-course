// 練習問題1 用: split-path.mjs のテスト
// 使い方: node --test split-path.test.mjs
//   模範解答を試す: MODULE=../solutions/split-path.mjs node --test split-path.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { splitPath } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './split-path.mjs')).href);

test('/ で分けた配列を返す', () => {
  assert.deepEqual(splitPath('/api/tasks/42'), ['api', 'tasks', '42']);
});

test('/ だけなら空の配列', () => {
  assert.deepEqual(splitPath('/'), []);
});

test('最後の / や、続いた // の間の空の部分は入れない', () => {
  assert.deepEqual(splitPath('/users/42/'), ['users', '42']);
  assert.deepEqual(splitPath('/a//b'), ['a', 'b']);
});

test('%xx をセグメントごとに戻す', () => {
  assert.deepEqual(splitPath('/tags/%E3%81%AD%E3%81%93'), ['tags', 'ねこ']);
  assert.deepEqual(splitPath('/q/a%20b'), ['q', 'a b']);
});

test('%2F は、分けた後で戻すので、1つのセグメントのまま', () => {
  assert.deepEqual(splitPath('/files/a%2Fb.txt'), ['files', 'a/b.txt']);
});

test('パスの + は + のまま', () => {
  assert.deepEqual(splitPath('/c/a+b'), ['c', 'a+b']);
});

test('%xx の形が壊れていたら null（例外を投げない）', () => {
  assert.equal(splitPath('/bad/%E0%A4%A'), null);
  assert.equal(splitPath('/bad/%zz'), null);
});
