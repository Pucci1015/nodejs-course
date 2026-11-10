// 練習問題6のテスト
// 使い方: node --test send.test.mjs
//         MODULE=../solutions/send.mjs node --test send.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './send.mjs')).href);

// 1つのサーバで、パスごとに道具を呼び分ける
const routes = {
  '/text': (res) => m.sendText(res, 200, 'こんにちは'),
  '/text-404': (res) => m.sendText(res, 404, 'ない', { 'Cache-Control': 'no-store' }),
  '/html': (res) => m.sendHtml(res, 200, '<p>日本語</p>'),
  '/json': (res) => m.sendJson(res, 201, { name: 'ねこ', n: 1 }),
  '/json-undefined': (res) => m.sendJson(res, 200, undefined),
  '/redirect': (res) => m.redirect(res, '/login'),
  '/redirect-303': (res) => m.redirect(res, '/done', 303),
  '/redirect-200': (res) => m.redirect(res, '/x', 200),
  '/no-content': (res) => m.noContent(res),
  '/text-204': (res) => m.sendText(res, 204, '捨てられるはず'),
};
const server = http.createServer((req, res) => {
  try {
    routes[req.url](res);
    if (!res.writableEnded) throw new Error('end が呼ばれていません');
  } catch (err) {
    if (res.headersSent) return res.destroy();
    res.writeHead(599, { 'X-Error': err.name });
    res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => { server.closeAllConnections(); server.close(); });

// fetch はリダイレクトを自動で追うので manual にする。返ってこないときは 2 秒で諦める
const get = (p, init = {}) => fetch(base + p, { redirect: 'manual', signal: AbortSignal.timeout(2000), ...init });

test('sendText: 文字コードと、バイト数の Content-Length', async () => {
  const r = await get('/text');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(r.headers.get('content-length'), '15'); // 5 文字 × 3 バイト
  assert.equal(await r.text(), 'こんにちは');
});

test('sendText: ステータスと追加のヘッダ', async () => {
  const r = await get('/text-404');
  assert.equal(r.status, 404);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal(await r.text(), 'ない');
});

test('sendHtml', async () => {
  const r = await get('/html');
  assert.equal(r.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(r.headers.get('content-length'), String(Buffer.byteLength('<p>日本語</p>')));
  assert.equal(await r.text(), '<p>日本語</p>');
});

test('sendJson', async () => {
  const r = await get('/json');
  assert.equal(r.status, 201);
  assert.equal(r.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.deepEqual(await r.json(), { name: 'ねこ', n: 1 });
});

test('sendJson: JSON にできない値（undefined）は TypeError を投げる', async () => {
  const r = await get('/json-undefined');
  assert.equal(r.status, 599);
  assert.equal(r.headers.get('x-error'), 'TypeError');
});

test('redirect: 既定は 302。Location が付く', async () => {
  const r = await get('/redirect');
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/login');
  const r2 = await get('/redirect-303');
  assert.equal(r2.status, 303);
  assert.equal(r2.headers.get('location'), '/done');
});

test('redirect: リダイレクトでないステータスは RangeError', async () => {
  const r = await get('/redirect-200');
  assert.equal(r.status, 599);
  assert.equal(r.headers.get('x-error'), 'RangeError');
});

test('noContent: 204。Content-Type も Content-Length も付けない', async () => {
  const r = await get('/no-content');
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('content-type'), null);
  assert.equal(r.headers.get('content-length'), null);
  const r2 = await get('/text-204');
  assert.equal(r2.status, 204);
  assert.equal(r2.headers.get('content-length'), null);
});

test('HEAD: GET と同じ Content-Length で、本文はない', async () => {
  for (const p of ['/text', '/html', '/json']) {
    const g = await get(p);
    const h = await get(p, { method: 'HEAD' });
    assert.equal(h.status, g.status, p);
    assert.equal(h.headers.get('content-length'), g.headers.get('content-length'), p);
    assert.equal(await h.text(), '', p);
  }
});
