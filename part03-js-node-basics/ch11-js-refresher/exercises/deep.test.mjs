// 練習問題7 用: deep.mjs の deepEqual と setIn のテスト
// 使い方: node --test deep.test.mjs
//   模範解答を試す: MODULE=../solutions/deep.mjs node --test deep.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './deep.mjs');
const { deepEqual, setIn } = await import(pathToFileURL(modulePath).href);

// ---- deepEqual ----
test('deepEqual: プリミティブ（NaN 同士は等しい。0 と -0 も等しい。型が違えば等しくない）', () => {
  assert.equal(deepEqual(1, 1), true);
  assert.equal(deepEqual('a', 'a'), true);
  assert.equal(deepEqual(NaN, NaN), true);
  assert.equal(deepEqual(0, -0), true);
  assert.equal(deepEqual(1, '1'), false);
  assert.equal(deepEqual(null, undefined), false);
  assert.equal(deepEqual(null, {}), false);
  assert.equal(deepEqual(1n, 1), false);
});

test('deepEqual: オブジェクトはキーの順番に関係なく、中身で比べる', () => {
  assert.equal(deepEqual({ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1 }), true);
  assert.equal(deepEqual({ a: 1 }, { a: 1, b: undefined }), false, 'キーの数が違う');
  assert.equal(deepEqual({ a: undefined }, { b: undefined }), false, 'キーの名前が違う');
});

test('deepEqual: 配列は順番と長さも比べる。配列とオブジェクトは等しくない', () => {
  assert.equal(deepEqual([1, [2, 3]], [1, [2, 3]]), true);
  assert.equal(deepEqual([1, 2], [2, 1]), false);
  assert.equal(deepEqual([1], [1, undefined]), false);
  assert.equal(deepEqual([], {}), false);
  assert.equal(deepEqual({ 0: 'a', length: 1 }, ['a']), false);
});

test('deepEqual: Date は時刻で、RegExp は source と flags で比べる', () => {
  assert.equal(deepEqual(new Date('2026-11-04'), new Date('2026-11-04T00:00:00Z')), true);
  assert.equal(deepEqual(new Date(0), new Date(1)), false);
  assert.equal(deepEqual(/a/g, /a/g), true);
  assert.equal(deepEqual(/a/g, /a/i), false);
  assert.equal(deepEqual(new Date(0), {}), false);
});

test('deepEqual: Map と Set', () => {
  assert.equal(deepEqual(new Map([['a', { x: 1 }]]), new Map([['a', { x: 1 }]])), true);
  assert.equal(deepEqual(new Map([['a', 1]]), new Map([['a', 2]])), false);
  assert.equal(deepEqual(new Map([['a', 1]]), new Map([['b', 1]])), false);
  assert.equal(deepEqual(new Set([1, 2, 3]), new Set([3, 2, 1])), true);
  assert.equal(deepEqual(new Set([1, 2]), new Set([1, 3])), false);
  assert.equal(deepEqual(new Map(), {}), false);
});

test('deepEqual: クラスが違えば、中身が同じでも等しくない', () => {
  class A {
    constructor() {
      this.x = 1;
    }
  }
  assert.equal(deepEqual(new A(), { x: 1 }), false);
  assert.equal(deepEqual(new A(), new A()), true);
});

test('deepEqual: 自分自身を指すオブジェクト（循環）でも止まらない', () => {
  const a = { name: 'a' };
  a.self = a;
  const b = { name: 'a' };
  b.self = b;
  assert.equal(deepEqual(a, b), true);
  const c = { name: 'c' };
  c.self = c;
  assert.equal(deepEqual(a, c), false);
});

// ---- setIn ----
const state = {
  user: { name: 'alice', settings: { theme: 'light', lang: 'ja' } },
  tasks: [
    { id: 1, title: '牛乳を買う', done: false },
    { id: 2, title: '第11章を読む', done: true },
  ],
};

test('setIn: 新しいオブジェクトを返し、元のオブジェクトは変えない', () => {
  const before = structuredClone(state);
  const next = setIn(state, ['user', 'settings', 'theme'], 'dark');
  assert.equal(next.user.settings.theme, 'dark');
  assert.deepEqual(state, before);
});

test('setIn: 通り道のオブジェクトだけを作り直し、それ以外は同じものを使い回す', () => {
  const next = setIn(state, ['user', 'settings', 'theme'], 'dark');
  assert.notEqual(next, state);
  assert.notEqual(next.user, state.user);
  assert.notEqual(next.user.settings, state.user.settings);
  assert.equal(next.tasks, state.tasks, '関係の無い tasks は同じ配列');
  assert.equal(next.user.settings.lang, 'ja');
});

test('setIn: 配列の中も、配列のまま作り直す', () => {
  const next = setIn(state, ['tasks', 0, 'done'], true);
  assert.ok(Array.isArray(next.tasks));
  assert.equal(next.tasks[0].done, true);
  assert.notEqual(next.tasks, state.tasks);
  assert.equal(next.tasks[1], state.tasks[1], '関係の無い要素は同じもの');
  assert.equal(state.tasks[0].done, false);
});

test('setIn: 値が変わらないなら、元のオブジェクトをそのまま返す', () => {
  assert.equal(setIn(state, ['user', 'name'], 'alice'), state);
  assert.equal(setIn(state, ['tasks', 1, 'done'], true), state);
});

test('setIn: 途中が無ければ作る（次のキーが数なら配列、文字列ならオブジェクト）', () => {
  const next = setIn({}, ['a', 'b', 0, 'c'], 1);
  assert.deepEqual(next, { a: { b: [{ c: 1 }] } });
  assert.ok(Array.isArray(next.a.b));
});

test('setIn: パスが空なら、値そのものを返す', () => {
  assert.equal(setIn(state, [], 42), 42);
});
