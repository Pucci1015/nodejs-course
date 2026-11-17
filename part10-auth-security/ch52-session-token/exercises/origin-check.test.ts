// 練習問題5 のテスト
// 使い方: node --test origin-check.test.ts
//   模範解答を試す: MODULE=../solutions/origin-check.ts node --test origin-check.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { startApp } from './client.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './origin-check.ts');
const { isAllowedRequest, requireSameOrigin }: typeof import('./origin-check.ts') = await import(pathToFileURL(file).href);

const allowed = ['http://localhost:5173', 'http://127.0.0.1:9627'];

test('GET・HEAD・OPTIONS は、ヘッダが無くても通す（小文字の get も）', () => {
  for (const m of ['GET', 'HEAD', 'OPTIONS', 'get']) assert.equal(isAllowedRequest(m, {}, allowed), true, m);
});

test('POST: Origin が allowed にあれば通し、無ければ断る', () => {
  assert.equal(isAllowedRequest('POST', { origin: 'http://localhost:5173' }, allowed), true);
  assert.equal(isAllowedRequest('POST', { origin: 'http://localhost:5174' }, allowed), false);
  assert.equal(isAllowedRequest('DELETE', { origin: 'https://other.example' }, allowed), false);
  assert.equal(isAllowedRequest('PATCH', { origin: 'null' }, allowed), false);
});

test('POST: Origin があれば Referer は見ない', () => {
  const headers = { origin: 'https://other.example', referer: 'http://localhost:5173/tasks' };
  assert.equal(isAllowedRequest('POST', headers, allowed), false);
});

test('POST: Origin が無ければ Referer のオリジンで決める', () => {
  assert.equal(isAllowedRequest('POST', { referer: 'http://localhost:5173/tasks?page=2' }, allowed), true);
  assert.equal(isAllowedRequest('POST', { referer: 'http://localhost:5173.other.example/' }, allowed), false);
  assert.equal(isAllowedRequest('POST', { referer: 'not a url' }, allowed), false);
});

test('POST: Origin も Referer も無ければ断る', () => {
  assert.equal(isAllowedRequest('POST', {}, allowed), false);
});

test('requireSameOrigin: 断るときは 403 と { detail }、通すときは次へ', async (t) => {
  const app = express();
  app.use(requireSameOrigin(allowed));
  app.post('/api/x', (_req, res) => {
    res.json({ ok: true });
  });
  const { browser } = await startApp(t, app);
  const b = browser();
  const ng = await b.post('/api/x', {}, { origin: 'https://other.example' });
  assert.equal(ng.status, 403);
  assert.deepEqual(ng.json, { detail: 'このサイトからのリクエストは受け付けません' });
  const ok = await b.post('/api/x', {}, { referer: 'http://127.0.0.1:9627/' });
  assert.equal(ok.status, 200);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
