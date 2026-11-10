// 練習問題2 用: greet-app.mjs のテスト。アプリを listen(0)（空いているポート）で起動して、fetch で確かめる
// 使い方: node --test greet-app.test.mjs
//   模範解答を試す: MODULE=../solutions/greet-app.mjs node --test greet-app.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { createGreetApp } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './greet-app.mjs')).href);

let server;
let base;
before(async () => {
  const app = createGreetApp();
  app.set('env', 'test');
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

const get = (url) => fetch(base + url, { signal: AbortSignal.timeout(2000) });
const post = (url, body, type) => fetch(base + url, {
  method: 'POST', body, headers: type ? { 'Content-Type': type } : {}, signal: AbortSignal.timeout(2000),
});

test('GET /greet?name=alice: あいさつの JSON', async () => {
  const res = await get('/greet?name=alice');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { message: 'こんにちは、aliceさん' });
});

test('GET /greet: name の前後の空白は取る。日本語も読める', async () => {
  const res = await get(`/greet?name=${encodeURIComponent(' ねこ ')}`);
  assert.deepEqual(await res.json(), { message: 'こんにちは、ねこさん' });
});

test('GET /greet: name が無い・空・2つなら 400 の JSON', async () => {
  for (const q of ['', '?name=', '?name=%20', '?name=a&name=b']) {
    const res = await get('/greet' + q);
    assert.equal(res.status, 400, q);
    assert.ok((await res.json()).error, q);
  }
});

test('POST /echo: JSON をそのまま返す', async () => {
  const res = await post('/echo', JSON.stringify({ a: 1, b: ['x'] }), 'application/json');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { received: { a: 1, b: ['x'] } });
});

test('POST /echo: JSON でなければ 415', async () => {
  const res = await post('/echo', 'a=1', 'application/x-www-form-urlencoded');
  assert.equal(res.status, 415);
  assert.ok((await res.json()).error);
});

test('X-Powered-By を付けない', async () => {
  const res = await get('/greet?name=a');
  assert.equal(res.headers.get('x-powered-by'), null);
});
