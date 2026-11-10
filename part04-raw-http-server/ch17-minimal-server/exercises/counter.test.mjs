// 練習問題2 用: counter.mjs のテスト
// 使い方: node --test counter.test.mjs
//   模範解答を試す: MODULE=../solutions/counter.mjs node --test counter.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './counter.mjs')).href);

// ハンドラごとにサーバを起動し、その URL を返す
const servers = [];
async function start() {
  const handler = m.createCounterHandler();
  assert.equal(typeof handler, 'function', 'createCounterHandler() は関数を返す');
  const server = http.createServer(handler);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}
test.after(() => { for (const s of servers) { s.closeAllConnections(); s.close(); } });

const get = (url) => fetch(url, { signal: AbortSignal.timeout(2000) });

test('/count を開くたびに 1, 2, 3 と増える', async () => {
  const base = await start();
  for (const n of [1, 2, 3]) {
    const r = await get(base + '/count');
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { count: n });
  }
});

test('/reset で 0 に戻り、次の /count は 1', async () => {
  const base = await start();
  await get(base + '/count');
  await get(base + '/count');
  const r = await get(base + '/reset');
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { count: 0, message: '0 に戻しました' });
  assert.deepEqual(await (await get(base + '/count')).json(), { count: 1 });
});

test('知らないパスは 404 と { error: 見つかりません }。数は増えない', async () => {
  const base = await start();
  const r = await get(base + '/nai');
  assert.equal(r.status, 404);
  assert.deepEqual(await r.json(), { error: '見つかりません' });
  assert.deepEqual(await (await get(base + '/count')).json(), { count: 1 });
});

test('Content-Type は application/json; charset=utf-8、Content-Length はバイト数', async () => {
  const base = await start();
  for (const p of ['/count', '/reset', '/nai']) {
    const r = await get(base + p);
    assert.equal(r.headers.get('content-type'), 'application/json; charset=utf-8', p);
    const body = Buffer.from(await r.arrayBuffer());
    assert.equal(r.headers.get('content-length'), String(body.length), p);
  }
});

test('createCounterHandler() で作ったハンドラは、それぞれ別の数を持つ', async () => {
  const a = await start();
  const b = await start();
  await get(a + '/count');
  await get(a + '/count');
  assert.deepEqual(await (await get(b + '/count')).json(), { count: 1 });
  assert.deepEqual(await (await get(a + '/count')).json(), { count: 3 });
});
