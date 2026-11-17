// 練習問題5 のテスト
// 使い方: node --test token-store.test.ts
//   模範解答を試す: MODULE=../solutions/token-store.ts node --test token-store.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './token-store.ts');
const { createTokenStore }: typeof import('./token-store.ts') = await import(pathToFileURL(file).href);

const MIN = 60 * 1000;

function setup() {
  let t = 0;
  const store = createTokenStore({ now: () => t });
  return { store, advance: (ms: number) => (t += ms) };
}

test('issue と consume（本文4節と同じ動き）: 1回だけ・使い道が合うときだけ・期限まで', () => {
  const { store, advance } = setup();
  const token = store.issue(1, 'verify', 10 * MIN);
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(store.consume(token, 'reset'), null);
  assert.equal(store.consume(token, 'verify'), 1);
  assert.equal(store.consume(token, 'verify'), null);
  const other = store.issue(2, 'reset', 10 * MIN);
  advance(10 * MIN);
  assert.equal(store.consume(other, 'reset'), null);
});

test('check: 使ったことにせずに userId を返す', () => {
  const { store } = setup();
  const token = store.issue(1, 'reset', 10 * MIN);
  assert.equal(store.check(token, 'reset'), 1);
  assert.equal(store.check(token, 'reset'), 1);
  assert.equal(store.check(token, 'verify'), null);
  assert.equal(store.consume(token, 'reset'), 1);
  assert.equal(store.check(token, 'reset'), null);
  assert.equal(store.check('unknown-token', 'reset'), null);
});

test('issue: 同じ人・同じ使い道の古いトークンは使えなくなる（ほかの人・ほかの使い道はそのまま）', () => {
  const { store } = setup();
  const old = store.issue(1, 'reset', 10 * MIN);
  const verify = store.issue(1, 'verify', 10 * MIN);
  const bobs = store.issue(2, 'reset', 10 * MIN);
  const latest = store.issue(1, 'reset', 10 * MIN);
  assert.equal(store.consume(old, 'reset'), null);
  assert.equal(store.consume(latest, 'reset'), 1);
  assert.equal(store.consume(verify, 'verify'), 1);
  assert.equal(store.consume(bobs, 'reset'), 2);
});

test('revokeAll: その人のトークンを、使い道に関係なくすべて使えなくする', () => {
  const { store } = setup();
  const a = store.issue(1, 'reset', 10 * MIN);
  const b = store.issue(1, 'verify', 10 * MIN);
  const c = store.issue(2, 'verify', 10 * MIN);
  store.revokeAll(1);
  assert.equal(store.check(a, 'reset'), null);
  assert.equal(store.check(b, 'verify'), null);
  assert.equal(store.check(c, 'verify'), 2);
});

test('purge: 期限切れと使用済みを消して、消した数を返す', () => {
  const { store, advance } = setup();
  const used = store.issue(1, 'verify', 60 * MIN);
  store.consume(used, 'verify');
  store.issue(2, 'reset', 5 * MIN);
  const alive = store.issue(3, 'reset', 60 * MIN);
  advance(10 * MIN);
  assert.equal(store.size(), 3);
  assert.equal(store.purge(), 2);
  assert.equal(store.size(), 1);
  assert.equal(store.check(alive, 'reset'), 3);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
