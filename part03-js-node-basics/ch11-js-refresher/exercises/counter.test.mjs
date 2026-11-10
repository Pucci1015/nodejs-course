// 練習問題1 用: counter.mjs の makeCounter のテスト
// 使い方: node --test counter.test.mjs
//   模範解答を試す: MODULE=../solutions/counter.mjs node --test counter.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './counter.mjs');
const { makeCounter } = await import(pathToFileURL(modulePath).href);

test('引数なしなら 0 から 1 ずつ増える', () => {
  const c = makeCounter();
  assert.equal(c.get(), 0);
  assert.equal(c.increment(), 1);
  assert.equal(c.increment(), 2);
  assert.equal(c.get(), 2);
});

test('start と step を指定できる', () => {
  const c = makeCounter(10, 5);
  assert.equal(c.get(), 10);
  assert.equal(c.increment(), 15);
  assert.equal(c.decrement(), 10);
  assert.equal(c.decrement(), 5);
});

test('reset で start の値に戻る', () => {
  const c = makeCounter(3);
  c.increment();
  c.increment();
  assert.equal(c.reset(), 3);
  assert.equal(c.get(), 3);
});

test('2つのカウンタは、別々の値を持つ', () => {
  const a = makeCounter();
  const b = makeCounter();
  a.increment();
  a.increment();
  b.increment();
  assert.equal(a.get(), 2);
  assert.equal(b.get(), 1);
});

test('外から c.count などを書き換えても、カウンタの値は変わらない', () => {
  const c = makeCounter();
  c.count = 100;
  c.value = 100;
  assert.equal(c.get(), 0);
  assert.equal(c.increment(), 1);
});
