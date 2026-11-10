// 練習問題2 用: hello-hono.mjs のテスト。サーバを起動せずに app.request で確かめる
// 使い方: node --test hello-hono.test.mjs
//   模範解答を試す: MODULE=../solutions/hello-hono.mjs node --test hello-hono.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { createHelloApp } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './hello-hono.mjs')).href);

const app = createHelloApp();

test('GET /hello/:name: 名前を入れたあいさつの JSON', async () => {
  const res = await app.request('/hello/alice');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { message: 'こんにちは、alice さん' });
});

test('GET /add?a=2&b=3: 足した数', async () => {
  const res = await app.request('/add?a=2&b=3');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { sum: 5 });
});

test('GET /add: マイナスも足せる', async () => {
  assert.deepEqual(await (await app.request('/add?a=-4&b=1')).json(), { sum: -3 });
});

test('GET /add: 整数でない・無いときは 400 と { error }', async () => {
  for (const q of ['?a=x&b=1', '?a=1', '?a=1.5&b=2', '?a=&b=2', '?a=2e1&b=1']) {
    const res = await app.request('/add' + q);
    assert.equal(res.status, 400, q);
    assert.deepEqual(await res.json(), { error: 'a と b は整数です' });
  }
});

test('DELETE /items/:id: 本文なしの 204', async () => {
  const res = await app.request('/items/7', { method: 'DELETE' });
  assert.equal(res.status, 204);
  assert.equal(await res.text(), '');
});

test('作っていない URL は 404', async () => {
  assert.equal((await app.request('/nothing')).status, 404);
  assert.equal((await app.request('/hello/alice', { method: 'POST' })).status, 404);
});
