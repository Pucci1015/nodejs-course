// 練習問題1 用: greeting.mjs のテスト（空いているポートでサーバを起動して、fetch で確かめる）
// 使い方: node --test greeting.test.mjs
//   模範解答を試す: MODULE=../solutions/greeting.mjs node --test greeting.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './greeting.mjs')).href);

const server = http.createServer(m.handler);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => { server.closeAllConnections(); server.close(); });

// 返ってこないときは 2 秒で諦める
const get = (p) => fetch(base + p, { signal: AbortSignal.timeout(2000) });

test('/ はトップページの文字を返す', async () => {
  const r = await get('/');
  assert.equal(r.status, 200);
  assert.equal(await r.text(), 'トップページです\n');
});

test('/hello?name=alice は、名前を入れてあいさつする', async () => {
  const r = await get('/hello?name=alice');
  assert.equal(r.status, 200);
  assert.equal(await r.text(), 'こんにちは、aliceさん\n');
});

test('/hello で name が無い・空なら、ゲスト', async () => {
  assert.equal(await (await get('/hello')).text(), 'こんにちは、ゲストさん\n');
  assert.equal(await (await get('/hello?name=')).text(), 'こんにちは、ゲストさん\n');
});

test('知らないパスは 404 と 見つかりません', async () => {
  const r = await get('/nai');
  assert.equal(r.status, 404);
  assert.equal(await r.text(), '見つかりません\n');
});

test('Content-Type は text/plain; charset=utf-8', async () => {
  for (const p of ['/', '/hello', '/nai']) {
    assert.equal((await get(p)).headers.get('content-type'), 'text/plain; charset=utf-8', p);
  }
});

test('Content-Length は、本文のバイト数', async () => {
  const r = await get('/hello?name=%E3%81%AD%E3%81%93'); // name=ねこ
  const body = Buffer.from(await r.arrayBuffer());
  assert.equal(body.toString(), 'こんにちは、ねこさん\n');
  assert.equal(r.headers.get('content-length'), String(body.length));
});
