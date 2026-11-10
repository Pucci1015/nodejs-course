// 練習問題3 用: error-handlers.mjs のテスト。小さなアプリに組み込んで、fetch で確かめる
// 使い方: node --test error-handlers.test.mjs
//   模範解答を試す: MODULE=../solutions/error-handlers.mjs node --test error-handlers.test.mjs
import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';

const { notFound, errorHandler } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './error-handlers.mjs')).href);

const app = express();
app.set('env', 'test');
app.get('/ok', (req, res) => res.json({ ok: true }));
app.get('/sync', () => { throw new Error('秘密の接続先 dev-only'); });
app.get('/async', async () => { throw new Error('async の中で失敗'); });
app.get('/teapot', () => { const err = new Error('コーヒーは入れられません'); err.status = 418; throw err; });
app.post('/json', express.json(), (req, res) => res.json(req.body));
app.use(notFound);
app.use(errorHandler);

let server;
let base;
const logged = [];
const originalError = console.error;
before(async () => {
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});
beforeEach(() => { logged.length = 0; console.error = (...a) => logged.push(a.map(String).join(' ')); });
afterEach(() => { console.error = originalError; });

const call = (url, init = {}) => fetch(base + url, { ...init, signal: AbortSignal.timeout(2000) });

test('notFound: 404 と JSON。メソッドとパスを入れる', async () => {
  const res = await call('/nothing?x=1');
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'not_found', message: 'GET /nothing はありません' });
});

test('notFound: ルートがあるものは、そのまま', async () => {
  const res = await call('/ok');
  assert.equal(res.status, 200);
});

test('errorHandler: 例外は 500。中身は隠し、console.error には書く', async () => {
  const res = await call('/sync');
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: 'internal', message: 'サーバのエラーです' });
  assert.ok(logged.some((l) => l.includes('秘密の接続先')));
});

test('errorHandler: async の中の例外も 500', async () => {
  const res = await call('/async');
  assert.equal(res.status, 500);
  assert.equal((await res.json()).error, 'internal');
});

test('errorHandler: err.status があれば、そのステータスと err.message', async () => {
  const res = await call('/teapot');
  assert.equal(res.status, 418);
  assert.deepEqual(await res.json(), { error: 'error', message: 'コーヒーは入れられません' });
  assert.equal(logged.length, 0);
});

test('errorHandler: 壊れた JSON は 400 の JSON（HTML にしない）', async () => {
  const res = await call('/json', { method: 'POST', body: '{"a":', headers: { 'Content-Type': 'application/json' } });
  assert.equal(res.status, 400);
  assert.match(res.headers.get('content-type'), /application\/json/);
  assert.equal((await res.json()).error, 'error');
});
