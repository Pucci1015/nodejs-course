// 練習問題1 のテスト
// 使い方: node --test cache-policy.test.ts
//   模範解答を試す: MODULE=../solutions/cache-policy.ts node --test cache-policy.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './cache-policy.ts');
const { cacheControlFor }: typeof import('./cache-policy.ts') = await import(pathToFileURL(file).href);

const IMMUTABLE = 'public, max-age=31536000, immutable';

test('ハッシュ付きのファイル（- か . の後に 8 文字、js・css・woff2・png・svg）は 1 年', () => {
  for (const p of ['/assets/index-C4mP8sLa.js', '/assets/index-B7xQ2k9d.css', '/assets/app.a80a786c.js', '/assets/font-Ab_cD-12.woff2', '/assets/logo-12345678.svg']) {
    assert.equal(cacheControlFor('GET', p, 200), IMMUTABLE, p);
  }
});

test('/assets/ でも、ハッシュの無い名前は public, max-age=0', () => {
  for (const p of ['/assets/app.js', '/assets/index-short.js', '/assets/index-C4mP8sLa.txt']) {
    assert.equal(cacheControlFor('GET', p, 200), 'public, max-age=0', p);
  }
});

test('画面の URL（拡張子なし）と / は no-cache', () => {
  for (const p of ['/', '/tasks', '/tasks/12', '/login']) assert.equal(cacheControlFor('GET', p, 200), 'no-cache', p);
});

test('名前の変わらないファイルは public, max-age=0', () => {
  for (const p of ['/robots.txt', '/favicon.ico', '/index.html']) assert.equal(cacheControlFor('GET', p, 200), 'public, max-age=0', p);
});

test('/api/public/ は CDN に 60 秒、ほかの API は private, no-store', () => {
  assert.equal(cacheControlFor('GET', '/api/public/stats', 200), 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  for (const p of ['/api/tasks', '/api/me', '/api', '/api/publicity']) {
    assert.equal(cacheControlFor('GET', p, 200), 'private, no-store', p);
  }
});

test('HEAD は GET と同じ。304 は 200 と同じ', () => {
  assert.equal(cacheControlFor('HEAD', '/assets/index-C4mP8sLa.js', 200), IMMUTABLE);
  assert.equal(cacheControlFor('GET', '/', 304), 'no-cache');
});

test('GET・HEAD 以外、200・304 以外は no-store', () => {
  assert.equal(cacheControlFor('POST', '/api/public/stats', 200), 'no-store');
  assert.equal(cacheControlFor('DELETE', '/api/tasks/1', 200), 'no-store');
  assert.equal(cacheControlFor('GET', '/assets/index-OLD12345.js', 404), 'no-store');
  assert.equal(cacheControlFor('GET', '/api/public/stats', 500), 'no-store');
  assert.equal(cacheControlFor('GET', '/old', 301), 'no-store');
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
