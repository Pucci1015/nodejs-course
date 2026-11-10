// 練習問題2 用: require-json.mjs のテスト。小さなアプリに組み込んで、fetch で確かめる
// 使い方: node --test require-json.test.mjs
//   模範解答を試す: MODULE=../solutions/require-json.mjs node --test require-json.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';

const { requireJson } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './require-json.mjs')).href);

let handled = 0;
const app = express();
app.set('env', 'test');
app.use(requireJson);
app.use(express.json());
app.all('/echo', (req, res) => { handled += 1; res.json({ method: req.method, body: req.body ?? null }); });

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

const call = (method, body, type) => fetch(base + '/echo', {
  method, body, headers: type ? { 'Content-Type': type } : {}, signal: AbortSignal.timeout(2000),
});

test('POST の JSON は、そのまま後ろへ進む', async () => {
  const res = await call('POST', '{"a":1}', 'application/json');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { method: 'POST', body: { a: 1 } });
});

test('charset が付いていても JSON として通す', async () => {
  const res = await call('PATCH', '{"a":1}', 'application/json; charset=utf-8');
  assert.equal(res.status, 200);
});

test('POST・PUT・PATCH で JSON でなければ 415 の JSON', async () => {
  for (const method of ['POST', 'PUT', 'PATCH']) {
    const res = await call(method, 'a=1', 'application/x-www-form-urlencoded');
    assert.equal(res.status, 415, method);
    assert.equal((await res.json()).error, 'unsupported_media_type', method);
  }
});

test('Content-Type が無い POST も 415', async () => {
  const res = await call('POST', 'x');
  assert.equal(res.status, 415);
});

test('415 のとき、後ろのハンドラは動かない', async () => {
  const before = handled;
  await call('POST', 'a=1', 'text/plain');
  assert.equal(handled, before);
});

test('GET と DELETE は、そのまま進む', async () => {
  assert.equal((await call('GET')).status, 200);
  assert.equal((await call('DELETE')).status, 200);
});
