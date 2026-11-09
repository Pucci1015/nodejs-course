// 練習問題3のテスト
// 使い方: node --test merge.test.mjs
//         MODULE=../solutions/merge.mjs node --test merge.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { safeMerge, pick } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './merge.mjs')).href);

// どのテストの後でも、Object.prototype が汚れていないこと
test.afterEach(() => {
  const dirty = Object.getOwnPropertyNames(Object.prototype).filter((k) => !['constructor', '__defineGetter__', '__defineSetter__', 'hasOwnProperty', '__lookupGetter__', '__lookupSetter__', 'isPrototypeOf', 'propertyIsEnumerable', 'toString', 'valueOf', '__proto__', 'toLocaleString'].includes(k));
  for (const k of dirty) delete Object.prototype[k];
  assert.deepEqual(dirty, [], 'Object.prototype にキーが増えました（プロトタイプ汚染）');
});

const statusOf = (fn) => {
  try {
    fn();
    return 'ok';
  } catch (err) {
    return err.status ?? err.name;
  }
};

test('RFC 7396 の例: 中まで混ぜる、null で消す、配列は置き換える', () => {
  const target = { title: 'Goodbye!', author: { givenName: 'John', familyName: 'Doe' }, tags: ['example', 'sample'], content: 'This will be unchanged' };
  const patch = { title: 'Hello!', phoneNumber: '+01-123-456-7890', author: { familyName: null }, tags: ['example'] };
  assert.deepEqual(safeMerge(target, patch), {
    title: 'Hello!', author: { givenName: 'John' }, tags: ['example'], content: 'This will be unchanged', phoneNumber: '+01-123-456-7890',
  });
});

test('値がオブジェクトでなければ、置き換える', () => {
  assert.deepEqual(safeMerge({ a: { b: 1 } }, { a: 'x' }), { a: 'x' });
  assert.deepEqual(safeMerge({ a: 'x' }, { a: { b: 1 } }), { a: { b: 1 } });
  assert.deepEqual(safeMerge({ a: 1 }, {}), { a: 1 });
});

test('target は書き換えない。結果は patch とも別のもの', () => {
  const target = { a: { b: 1 }, list: [1] };
  const patch = { a: { c: 2 }, list: [2, 3] };
  const r = safeMerge(target, patch);
  assert.deepEqual(target, { a: { b: 1 }, list: [1] });
  r.list.push(4);
  assert.deepEqual(patch.list, [2, 3]);
});

test('"__proto__" を含む JSON でも、Object.prototype も結果のプロトタイプも変わらない', () => {
  const patch = JSON.parse('{"theme":"dark","__proto__":{"isAdmin":true}}');
  assert.equal(statusOf(() => safeMerge({}, patch)), 400);
  assert.equal({}.isAdmin, undefined);
});

test('"constructor": {"prototype": ...} も断る', () => {
  const patch = JSON.parse('{"constructor":{"prototype":{"isAdmin":true}}}');
  assert.equal(statusOf(() => safeMerge({}, patch)), 400);
  const deep = JSON.parse('{"a":{"b":{"__proto__":{"x":1}}}}');
  assert.equal(statusOf(() => safeMerge({ a: { b: {} } }, deep)), 400);
});

test('入れ子が深すぎたら 400（既定は 10 段）', () => {
  let deep = { v: 1 };
  for (let i = 0; i < 20; i++) deep = { d: deep };
  assert.equal(statusOf(() => safeMerge({}, deep)), 400);
  assert.equal(statusOf(() => safeMerge({}, { a: { b: { c: 1 } } }, { maxDepth: 2 })), 400);
  assert.deepEqual(safeMerge({}, { a: { b: 1 } }, { maxDepth: 2 }), { a: { b: 1 } });
});

test('target のプロトタイプの先のものは、拾わない', () => {
  const proto = { inherited: { x: 1 } };
  const target = Object.create(proto);
  target.own = 1;
  assert.deepEqual(safeMerge(target, { inherited: { y: 2 } }), { own: 1, inherited: { y: 2 } });
});

test('pick: 決めたキーだけ。自分のキーだけ', () => {
  const body = JSON.parse('{"name":"りょうた","email":"a@example.com","role":"admin","__proto__":{"x":1}}');
  assert.deepEqual(pick(body, ['name', 'email']), { name: 'りょうた', email: 'a@example.com' });
  assert.deepEqual(pick(Object.create({ name: '継承' }), ['name']), {});
  assert.deepEqual(pick(null, ['name']), {});
  assert.deepEqual(pick(['a'], ['0']), {});
});
