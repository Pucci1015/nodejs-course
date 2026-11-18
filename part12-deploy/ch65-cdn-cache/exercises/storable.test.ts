// 練習問題5 のテスト
// 使い方: node --test storable.test.ts
//   模範解答を試す: MODULE=../solutions/storable.ts node --test storable.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './storable.ts');
const { whyNotStore }: typeof import('./storable.ts') = await import(pathToFileURL(file).href);

const get = (headers: Record<string, string> = {}) => ({ method: 'GET', headers });
const ok = (headers: Record<string, string>, status = 200) => ({ status, headers });

test('時間が書いてある GET の 200 は覚えてよい（s-maxage・max-age・no-cache のどれか）', () => {
  assert.equal(whyNotStore(get(), ok({ 'cache-control': 'public, max-age=0, s-maxage=60' })), undefined);
  assert.equal(whyNotStore(get(), ok({ 'cache-control': 'max-age=60' })), undefined);
  assert.equal(whyNotStore(get(), ok({ 'cache-control': 'no-cache', etag: '"a"' })), undefined);
  assert.equal(whyNotStore(get(), ok({ 'cache-control': 'Max-Age=60' })), undefined, '名前は大文字・小文字を区別しない');
});

test('GET 以外は method、覚えない状態は status', () => {
  assert.equal(whyNotStore({ method: 'POST', headers: {} }, ok({ 'cache-control': 'max-age=60' })), 'method');
  assert.equal(whyNotStore({ method: 'HEAD', headers: {} }, ok({ 'cache-control': 'max-age=60' })), 'method');
  for (const s of [201, 302, 400, 401, 500, 503]) {
    assert.equal(whyNotStore(get(), ok({ 'cache-control': 'max-age=60' }, s)), 'status', String(s));
  }
  for (const s of [301, 404, 410]) assert.equal(whyNotStore(get(), ok({ 'cache-control': 'max-age=60' }, s)), undefined, String(s));
});

test('no-store と private', () => {
  assert.equal(whyNotStore(get(), ok({ 'cache-control': 'no-store, max-age=60' })), 'no-store');
  assert.equal(whyNotStore(get(), ok({ 'cache-control': 'private, max-age=60' })), 'private');
});

test('Set-Cookie がある応答は覚えない', () => {
  assert.equal(whyNotStore(get(), ok({ 'cache-control': 'public, max-age=60', 'set-cookie': 'sid=abc' })), 'set-cookie');
});

test('Vary: * は覚えない。Vary: Accept-Language は覚えてよい', () => {
  assert.equal(whyNotStore(get(), ok({ 'cache-control': 'max-age=60', vary: '*' })), 'vary-star');
  assert.equal(whyNotStore(get(), ok({ 'cache-control': 'max-age=60', vary: 'Accept-Encoding, *' })), 'vary-star');
  assert.equal(whyNotStore(get(), ok({ 'cache-control': 'max-age=60', vary: 'Accept-Language' })), undefined);
});

test('Authorization 付きの頼みは、public か s-maxage があるときだけ覚えてよい', () => {
  const auth = get({ authorization: 'Bearer dev-only-token' });
  assert.equal(whyNotStore(auth, ok({ 'cache-control': 'max-age=60' })), 'authorization');
  assert.equal(whyNotStore(auth, ok({ 'cache-control': 'public, max-age=60' })), undefined);
  assert.equal(whyNotStore(auth, ok({ 'cache-control': 's-maxage=60' })), undefined);
});

test('時間が書いていなければ no-freshness', () => {
  assert.equal(whyNotStore(get(), ok({})), 'no-freshness');
  assert.equal(whyNotStore(get(), ok({ 'cache-control': 'public', etag: '"a"' })), 'no-freshness');
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
