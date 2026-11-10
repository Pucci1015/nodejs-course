// 練習問題2 用: health.mjs のテスト。アプリに組み込んで、fetch で確かめる
// 使い方: node --test health.test.mjs
//   模範解答を試す: MODULE=../solutions/health.mjs node --test health.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';

const { createHealthRouter } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './health.mjs')).href);

let ready = true;
const app = express();
app.set('env', 'test');
app.use(createHealthRouter({ isReady: () => ready }));

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

const get = (url) => fetch(base + url, { signal: AbortSignal.timeout(2000) });

test('GET /healthz: 200 と { status: "ok" }', async () => {
  const res = await get('/healthz');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('GET /readyz: 準備ができていれば 200 と { status: "ready" }', async () => {
  ready = true;
  const res = await get('/readyz');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ready' });
});

test('GET /readyz: 準備ができていなければ 503 と { status: "not_ready" }', async () => {
  ready = false;
  const res = await get('/readyz');
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { status: 'not_ready' });
  ready = true;
});

test('isReady はリクエストのたびに呼ぶ（作ったときの値で決めない）', async () => {
  ready = false;
  assert.equal((await get('/readyz')).status, 503);
  ready = true;
  assert.equal((await get('/readyz')).status, 200);
});

test('GET /healthz は、準備ができていなくても 200', async () => {
  ready = false;
  assert.equal((await get('/healthz')).status, 200);
  ready = true;
});

test('どちらも Cache-Control: no-store を付ける', async () => {
  assert.equal((await get('/healthz')).headers.get('cache-control'), 'no-store');
  assert.equal((await get('/readyz')).headers.get('cache-control'), 'no-store');
});
