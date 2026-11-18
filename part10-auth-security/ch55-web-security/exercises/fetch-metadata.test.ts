// 練習問題2 のテスト
// 使い方: node --test fetch-metadata.test.ts
//   模範解答を試す: MODULE=../solutions/fetch-metadata.ts node --test fetch-metadata.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { startApp } from './client.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './fetch-metadata.ts');
const { isAllowedRequest, fetchMetadataGuard }: typeof import('./fetch-metadata.ts') = await import(pathToFileURL(file).href);

const opts = { publicPaths: ['/api/public/'] };
const cross = { site: 'cross-site', mode: 'cors', dest: 'empty' };

test('ヘッダが無い・same-origin・none は通す（どのメソッドでも）', () => {
  for (const site of [undefined, 'same-origin', 'none']) {
    assert.equal(isAllowedRequest({ method: 'POST', path: '/api/tasks', site, mode: 'cors', dest: 'empty' }, opts), true, String(site));
  }
});

test('別のサイト（cross-site・same-site）の fetch・フォームの POST は断る', () => {
  for (const site of ['cross-site', 'same-site']) {
    assert.equal(isAllowedRequest({ method: 'POST', path: '/api/tasks', site, mode: 'cors', dest: 'empty' }, opts), false);
    assert.equal(isAllowedRequest({ method: 'POST', path: '/tasks', site, mode: 'navigate', dest: 'document' }, opts), false, 'フォームの POST');
    assert.equal(isAllowedRequest({ method: 'GET', path: '/api/tasks', site, mode: 'cors', dest: 'empty' }, opts), false, 'fetch の GET');
  }
});

test('別のサイトからのページの移動（GET・navigate・document）は通す。iframe・画像は断る', () => {
  assert.equal(isAllowedRequest({ method: 'GET', path: '/tasks', site: 'cross-site', mode: 'navigate', dest: 'document' }, opts), true);
  assert.equal(isAllowedRequest({ method: 'GET', path: '/tasks', site: 'cross-site', mode: 'navigate', dest: 'iframe' }, opts), false);
  assert.equal(isAllowedRequest({ method: 'GET', path: '/tasks', site: 'cross-site', mode: 'no-cors', dest: 'image' }, opts), false);
});

test('publicPaths で始まる場所は、GET・HEAD ならどこからでも。POST は断る', () => {
  assert.equal(isAllowedRequest({ method: 'GET', path: '/api/public/stats', ...cross }, opts), true);
  assert.equal(isAllowedRequest({ method: 'HEAD', path: '/api/public/stats', ...cross }, opts), true);
  assert.equal(isAllowedRequest({ method: 'POST', path: '/api/public/stats', ...cross }, opts), false);
  assert.equal(isAllowedRequest({ method: 'GET', path: '/api/publicity', ...cross }, opts), false, '/api/public/ で始まらない');
  assert.equal(isAllowedRequest({ method: 'GET', path: '/api/public/stats', ...cross }), false, 'publicPaths の既定は空');
});

test('fetchMetadataGuard: 断るときは 403 と JSON。通すときは次へ', async (t) => {
  const app = express();
  app.use(fetchMetadataGuard(opts));
  app.post('/api/tasks', (_req, res) => res.status(201).json({ ok: true }));
  app.get('/api/public/stats', (_req, res) => res.json({ count: 3 }));
  const { browser } = await startApp(t, app);
  const b = browser();
  assert.equal((await b.post('/api/tasks', {})).status, 201);
  assert.equal((await b.post('/api/tasks', {}, { 'sec-fetch-site': 'same-origin' })).status, 201);
  const ng = await b.post('/api/tasks', {}, { 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'cors', 'sec-fetch-dest': 'empty' });
  assert.equal(ng.status, 403);
  assert.deepEqual(ng.json, { detail: '別のサイトからのリクエストは受け付けません' });
  assert.equal((await b.get('/api/public/stats', { 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'cors', 'sec-fetch-dest': 'empty' })).status, 200);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
