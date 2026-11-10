// 練習問題2 用: waiters.mjs のテスト
// 使い方: node --test waiters.test.mjs
//   模範解答を試す: MODULE=../solutions/waiters.mjs node --test waiters.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { createWaiters } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './waiters.mjs')).href);

test('add で増え、size で数が分かる', () => {
  const w = createWaiters();
  assert.equal(w.size(), 0);
  w.add(() => {});
  w.add(() => {});
  assert.equal(w.size(), 2);
});

test('notifyAll で、待っている全員を値といっしょに呼ぶ', () => {
  const w = createWaiters();
  const got = [];
  w.add((v) => got.push(['a', v]));
  w.add((v) => got.push(['b', v]));
  w.notifyAll('new');
  assert.deepEqual(got, [['a', 'new'], ['b', 'new']]);
});

test('notifyAll で呼んだ人は、一覧から外れる（2回目には呼ばれない）', () => {
  const w = createWaiters();
  let count = 0;
  w.add(() => { count += 1; });
  w.notifyAll(1);
  assert.equal(w.size(), 0);
  w.notifyAll(2);
  assert.equal(count, 1);
});

test('add が返す関数で、待つのをやめられる', () => {
  const w = createWaiters();
  let called = false;
  const remove = w.add(() => { called = true; });
  remove();
  assert.equal(w.size(), 0);
  w.notifyAll('x');
  assert.equal(called, false);
});

test('やめる関数を2回呼んでも、ほかの人は消えない', () => {
  const w = createWaiters();
  const remove = w.add(() => {});
  w.add(() => {});
  remove();
  remove();
  assert.equal(w.size(), 1);
});

test('呼ばれた関数の中で add しても、その回には呼ばれない（次の notifyAll で呼ばれる）', () => {
  const w = createWaiters();
  const got = [];
  w.add((v) => {
    got.push(`first ${v}`);
    w.add((v2) => got.push(`second ${v2}`));
  });
  w.notifyAll(1);
  assert.deepEqual(got, ['first 1']);
  w.notifyAll(2);
  assert.deepEqual(got, ['first 1', 'second 2']);
});
