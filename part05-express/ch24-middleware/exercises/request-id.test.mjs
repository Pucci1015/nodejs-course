// 練習問題1 用: request-id.mjs のテスト。小さなアプリに組み込んで、fetch で確かめる
// 使い方: node --test request-id.test.mjs
//   模範解答を試す: MODULE=../solutions/request-id.mjs node --test request-id.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';

const { requestId } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './request-id.mjs')).href);

const app = express();
app.set('env', 'test');
app.use(requestId());
app.get('/id', (req, res) => res.json({ id: req.id ?? null }));

let server;
let base;
before(async () => {
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

const get = (headers = {}) => fetch(base + '/id', { headers, signal: AbortSignal.timeout(2000) });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

test('requestId() は関数（ミドルウェア）を返す', () => {
  assert.equal(typeof requestId(), 'function');
});

test('ID が送られてこなければ、randomUUID で作って req.id に入れる', async () => {
  const res = await get();
  const { id } = await res.json();
  assert.match(id, UUID);
});

test('作った ID を X-Request-Id ヘッダでも返す', async () => {
  const res = await get();
  const { id } = await res.json();
  assert.equal(res.headers.get('x-request-id'), id);
});

test('リクエストごとに違う ID', async () => {
  const a = (await (await get()).json()).id;
  const b = (await (await get()).json()).id;
  assert.notEqual(a, b);
});

test('正しい形の X-Request-Id が送られてきたら、それを使う', async () => {
  const res = await get({ 'X-Request-Id': 'abc-123' });
  assert.equal((await res.json()).id, 'abc-123');
  assert.equal(res.headers.get('x-request-id'), 'abc-123');
});

test('形の正しくない X-Request-Id は使わない（記号・長すぎる）', async () => {
  for (const bad of ['a b', 'a;b', 'x'.repeat(65), 'a/b']) {
    const res = await get({ 'X-Request-Id': bad });
    assert.match((await res.json()).id, UUID, bad);
  }
});
