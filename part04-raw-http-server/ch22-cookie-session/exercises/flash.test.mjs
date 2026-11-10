// 練習問題2 用: flash.mjs のテスト
// 使い方: node --test flash.test.mjs
//   模範解答を試す: MODULE=../solutions/flash.mjs node --test flash.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './flash.mjs')).href);

test('addFlash: session.flash の配列に足す', () => {
  const session = {};
  m.addFlash(session, '保存しました');
  assert.deepEqual(session.flash, ['保存しました']);
});

test('addFlash: 2つ目は後ろに足す', () => {
  const session = {};
  m.addFlash(session, 'ログインしました');
  m.addFlash(session, '保存しました');
  assert.deepEqual(session.flash, ['ログインしました', '保存しました']);
});

test('addFlash: 他のキーは変えない', () => {
  const session = { userId: 1 };
  m.addFlash(session, 'a');
  assert.equal(session.userId, 1);
});

test('takeFlash: 全部を返し、セッションから消す', () => {
  const session = { userId: 1 };
  m.addFlash(session, 'a');
  m.addFlash(session, 'b');
  assert.deepEqual(m.takeFlash(session), ['a', 'b']);
  assert.equal(Object.hasOwn(session, 'flash'), false);
  assert.equal(session.userId, 1);
});

test('takeFlash: 2回目は空の配列（1回だけ）', () => {
  const session = {};
  m.addFlash(session, 'a');
  m.takeFlash(session);
  assert.deepEqual(m.takeFlash(session), []);
});

test('takeFlash: 何も入れていなければ空の配列', () => {
  assert.deepEqual(m.takeFlash({}), []);
});
