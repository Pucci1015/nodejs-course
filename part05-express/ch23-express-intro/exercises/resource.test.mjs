// 練習問題3のテスト
// 使い方: node --test resource.test.mjs
//         MODULE=../solutions/resource.mjs node --test resource.test.mjs   （解答例で確かめる）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';

const { resource } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './resource.mjs')).href);

const calls = [];
const app = express();
app.set('env', 'test');
app.use(express.json());
resource(app, '/tasks', {
  get: (req, res) => res.json({ list: true }),
  post: (req, res) => res.status(201).json({ created: true }),
});
resource(app, '/tasks/:id', {
  get: (req, res) => res.json({ id: req.params.id }),
  patch: [
    (req, res, next) => {
      calls.push('check');
      next();
    },
    (req, res) => res.json({ patched: req.params.id }),
  ],
  delete: (req, res) => res.sendStatus(204),
});
resource(app, '/ping', { post: (req, res) => res.send('pong') });
const router = express.Router();
resource(router, '/items', { put: (req, res) => res.send('put') });
app.use('/v2', router);
app.use((req, res) => res.status(404).json({ error: 'not_found' }));

let server;
let base;
before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.closeAllConnections();
  server.close();
});

async function call(method, url) {
  const res = await fetch(base + url, { method, signal: AbortSignal.timeout(2000) });
  const text = await res.text();
  return { status: res.status, allow: res.headers.get('allow'), type: res.headers.get('content-type') ?? '', text };
}

test('1. 登録したメソッドは、ふつうに動く（配列のハンドラも）', async () => {
  assert.equal((await call('GET', '/tasks')).text, '{"list":true}');
  assert.equal((await call('POST', '/tasks')).status, 201);
  assert.equal((await call('PATCH', '/tasks/7')).text, '{"patched":"7"}');
  assert.deepEqual(calls, ['check']);
  assert.equal((await call('DELETE', '/tasks/7')).status, 204);
});

test('2. 登録していないメソッドは 405。Allow は決まった順番で、GET があれば HEAD も入る', async () => {
  const a = await call('DELETE', '/tasks');
  assert.equal(a.status, 405);
  assert.equal(a.allow, 'GET, HEAD, POST, OPTIONS');
  const b = await call('PUT', '/tasks/3');
  assert.equal(b.status, 405);
  assert.equal(b.allow, 'GET, HEAD, PATCH, DELETE, OPTIONS');
  const c = await call('GET', '/ping');
  assert.equal(c.status, 405);
  assert.equal(c.allow, 'POST, OPTIONS', 'GET が無ければ HEAD も無い');
});

test('3. 405 の本文は JSON で、error は method_not_allowed', async () => {
  const r = await call('DELETE', '/tasks');
  assert.ok(r.type.startsWith('application/json'));
  assert.equal(JSON.parse(r.text).error, 'method_not_allowed');
});

test('4. OPTIONS は 204 と Allow（本文なし）', async () => {
  const r = await call('OPTIONS', '/tasks/3');
  assert.equal(r.status, 204);
  assert.equal(r.allow, 'GET, HEAD, PATCH, DELETE, OPTIONS');
  assert.equal(r.text, '');
});

test('5. HEAD は GET のハンドラで答える（405 にしない）。GET が無ければ HEAD も 405', async () => {
  assert.equal((await call('HEAD', '/tasks/3')).status, 200);
  assert.equal((await call('HEAD', '/ping')).status, 405);
});

test('6. Router に付けても動き、パスの無いものは 404 のまま', async () => {
  assert.equal((await call('PUT', '/v2/items')).text, 'put');
  const r = await call('GET', '/v2/items');
  assert.equal(r.status, 405);
  assert.equal(r.allow, 'PUT, OPTIONS');
  assert.equal((await call('DELETE', '/nothing')).status, 404);
});

test('7. 知らない名前（gett など）やハンドラでないものを渡したら、登録の時点で TypeError', () => {
  assert.throws(() => resource(express(), '/x', { gett: () => {} }), TypeError);
  assert.throws(() => resource(express(), '/x', { get: 'handler' }), TypeError);
  assert.throws(() => resource(express(), '/x', {}), TypeError, 'ハンドラが1つも無い');
});
