// 練習問題3 用: csrf.mjs のテスト
// 使い方: node --test csrf.test.mjs
//   模範解答を試す: MODULE=../solutions/csrf.mjs node --test csrf.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './csrf.mjs')).href);

test('newToken: 43 文字の base64url', () => {
  const t = m.newToken();
  assert.equal(typeof t, 'string');
  assert.equal(t.length, 43);
  assert.match(t, /^[A-Za-z0-9_-]+$/);
});

test('newToken: 呼ぶたびに違う', () => {
  assert.notEqual(m.newToken(), m.newToken());
});

test('ensureCsrf: 無ければ作ってセッションに入れ、それを返す', () => {
  const session = {};
  const t = m.ensureCsrf(session);
  assert.equal(t.length, 43);
  assert.equal(session.csrf, t);
});

test('ensureCsrf: もうあれば、作り直さない', () => {
  const session = {};
  const t = m.ensureCsrf(session);
  assert.equal(m.ensureCsrf(session), t);
});

test('checkCsrf: 同じなら true、違えば false', () => {
  const session = {};
  const t = m.ensureCsrf(session);
  assert.equal(m.checkCsrf(session, t), true);
  assert.equal(m.checkCsrf(session, t.slice(0, -1) + (t.endsWith('A') ? 'B' : 'A')), false);
  assert.equal(m.checkCsrf(session, 'short'), false);
});

test('checkCsrf: 送られてこない、セッションに無いときは false', () => {
  const session = {};
  m.ensureCsrf(session);
  assert.equal(m.checkCsrf(session, undefined), false);
  assert.equal(m.checkCsrf(session, null), false);
  assert.equal(m.checkCsrf({}, 'abc'), false);
  assert.equal(m.checkCsrf({}, undefined), false);
});
