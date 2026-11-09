// 練習問題5 用: lru.mjs の LRUCache クラスのテスト
// 使い方: node --test lru.test.mjs
//   模範解答を試す: MODULE=../solutions/lru.mjs node --test lru.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './lru.mjs');
const { LRUCache } = await import(pathToFileURL(modulePath).href);

test('set と get', () => {
  const c = new LRUCache(2);
  assert.equal(c.set('a', 1), c, 'set は this を返す（つなげて書ける）');
  assert.equal(c.get('a'), 1);
  assert.equal(c.get('none'), undefined);
  assert.equal(c.size, 1);
});

test('容量を超えると、いちばん長く使われていないものを捨てる', () => {
  const c = new LRUCache(2);
  c.set('a', 1).set('b', 2);
  c.get('a'); // a を使った → いちばん古いのは b
  c.set('c', 3);
  assert.equal(c.has('b'), false);
  assert.equal(c.has('a'), true);
  assert.equal(c.has('c'), true);
  assert.equal(c.size, 2);
});

test('既にあるキーを set すると、値を変え、最近使ったことにする', () => {
  const c = new LRUCache(2);
  c.set('a', 1).set('b', 2).set('a', 10).set('c', 3);
  assert.equal(c.get('a'), 10);
  assert.equal(c.has('b'), false);
});

test('has と peek は「使った」ことにしない', () => {
  const c = new LRUCache(2);
  c.set('a', 1).set('b', 2);
  assert.equal(c.has('a'), true);
  assert.equal(c.peek('a'), 1);
  c.set('c', 3); // a はまだいちばん古い
  assert.equal(c.has('a'), false);
});

test('キーには文字列以外も使える（オブジェクトは同じ参照のときだけ同じキー）', () => {
  const c = new LRUCache(3);
  const key = { id: 1 };
  c.set(key, 'obj').set(1, 'number').set('1', 'string');
  assert.equal(c.get(key), 'obj');
  assert.equal(c.get({ id: 1 }), undefined);
  assert.equal(c.get(1), 'number');
  assert.equal(c.get('1'), 'string');
});

test('値が undefined でも、has は true', () => {
  const c = new LRUCache(1);
  c.set('a', undefined);
  assert.equal(c.has('a'), true);
});

test('delete と clear', () => {
  const c = new LRUCache(3);
  c.set('a', 1).set('b', 2);
  assert.equal(c.delete('a'), true);
  assert.equal(c.delete('a'), false);
  assert.equal(c.size, 1);
  c.clear();
  assert.equal(c.size, 0);
});

test('onEvict: 容量を超えて捨てたときだけ、キーと値を渡して呼ぶ（delete・clear・上書きでは呼ばない）', () => {
  const evicted = [];
  const c = new LRUCache(2, { onEvict: (key, value) => evicted.push([key, value]) });
  c.set('a', 1).set('b', 2).set('a', 100);
  c.delete('b');
  c.set('c', 3).set('d', 4);
  c.clear();
  assert.deepEqual(evicted, [['a', 100]]);
});

test('for...of で [キー, 値] を、最近使った順に取り出せる', () => {
  const c = new LRUCache(3);
  c.set('a', 1).set('b', 2).set('c', 3);
  c.get('a');
  assert.deepEqual([...c], [['a', 1], ['c', 3], ['b', 2]]);
  assert.deepEqual([...c.keys()], ['a', 'c', 'b']);
});

test('中身はクラスの外から見えない（# のフィールドを使う）', () => {
  const c = new LRUCache(2);
  c.set('a', 1);
  assert.deepEqual(Object.keys(c), []);
  assert.equal(JSON.stringify(c), '{}');
});

test('容量は1以上の整数。そうでなければ RangeError', () => {
  for (const bad of [0, -1, 1.5, NaN, '2', undefined]) {
    assert.throws(() => new LRUCache(bad), RangeError, String(bad));
  }
  assert.doesNotThrow(() => new LRUCache(Infinity));
});

test('2つのキャッシュは、中身を共有しない', () => {
  const a = new LRUCache(2);
  const b = new LRUCache(2);
  a.set('x', 1);
  assert.equal(b.has('x'), false);
});
