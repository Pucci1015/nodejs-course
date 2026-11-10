// 練習問題1 用: web-json.mjs のテスト
// 使い方: node --test web-json.test.mjs
//   模範解答を試す: MODULE=../solutions/web-json.mjs node --test web-json.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { readJson, problemResponse } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './web-json.mjs')).href);

const post = (body, type = 'application/json') =>
  new Request('http://localhost/tasks', { method: 'POST', headers: type ? { 'Content-Type': type } : {}, body });

test('readJson: JSON なら { ok: true, value }', async () => {
  assert.deepEqual(await readJson(post('{"title":"牛乳"}')), { ok: true, value: { title: '牛乳' } });
});

test('readJson: charset が付いていても、大文字でも JSON として読む', async () => {
  assert.deepEqual(await readJson(post('[1,2]', 'Application/JSON; charset=utf-8')), { ok: true, value: [1, 2] });
});

test('readJson: Content-Type が JSON でない・無いときは 415', async () => {
  assert.deepEqual(await readJson(post('{"a":1}', 'text/plain')), { ok: false, status: 415 });
  assert.deepEqual(await readJson(post('{"a":1}', null)), { ok: false, status: 415 });
});

test('readJson: 壊れた JSON は、投げずに 400', async () => {
  assert.deepEqual(await readJson(post('{"title":')), { ok: false, status: 400 });
});

test('problemResponse: ステータスと Content-Type が正しい Response', async () => {
  const res = problemResponse(404, '/tasks/9');
  assert.ok(res instanceof Response);
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('content-type'), 'application/problem+json');
});

test('problemResponse: 本文は Problem Details', async () => {
  const res = problemResponse(415, '/tasks');
  assert.deepEqual(await res.json(), { type: 'about:blank', title: 'Unsupported Media Type', status: 415, instance: '/tasks' });
});
