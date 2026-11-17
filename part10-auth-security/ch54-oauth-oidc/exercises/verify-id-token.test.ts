// 練習問題5 のテスト
// 使い方: node --test verify-id-token.test.ts
//   模範解答を試す: MODULE=../solutions/verify-id-token.ts node --test verify-id-token.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeKey, signRs256 } from './keys.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './verify-id-token.ts');
const { verifyIdToken }: typeof import('./verify-id-token.ts') = await import(pathToFileURL(file).href);

const ISSUER = 'http://127.0.0.1:9640';
const NOW = Date.UTC(2026, 10, 18, 9, 0, 0);
const NOW_SEC = NOW / 1000;
const key = makeKey('k1');
const other = makeKey('k1'); // 同じ kid の、別の鍵
const keys = [key.jwk];
const opts = { issuer: ISSUER, clientId: 'task-app', nonce: 'n-1', now: NOW };
const claims = { iss: ISSUER, sub: 'u-1001', aud: 'task-app', iat: NOW_SEC, exp: NOW_SEC + 300, nonce: 'n-1', email: 'alice@example.com' };
const header = { alg: 'RS256', typ: 'JWT', kid: 'k1' };
const make = (c: Record<string, unknown> = claims, h: Record<string, unknown> = header, k = key.privateKey) => signRs256(h, c, k);

test('正しいトークン: { ok: true, claims }', () => {
  assert.deepEqual(verifyIdToken(make(), keys, opts), { ok: true, claims });
});

test('malformed: 3つに分かれない・JSON でない', () => {
  const [h, p] = make().split('.');
  for (const t of ['abc', `${h}.${p}`, `${h}.${p}.`, `${h}.${Buffer.from('[]').toString('base64url')}.abc`]) {
    assert.deepEqual(verifyIdToken(t, keys, opts), { ok: false, error: 'malformed' }, t);
  }
});

test('alg: RS256 以外', () => {
  assert.deepEqual(verifyIdToken(make(claims, { ...header, alg: 'HS256' }), keys, opts), { ok: false, error: 'alg' });
  assert.deepEqual(verifyIdToken(make(claims, { ...header, alg: 'none' }), keys, opts), { ok: false, error: 'alg' });
});

test('key: kid が合う鍵が無い', () => {
  assert.deepEqual(verifyIdToken(make(claims, { ...header, kid: 'k9' }), keys, opts), { ok: false, error: 'key' });
});

test('signature: 別の秘密鍵で署名した・中身を書き換えた', () => {
  assert.deepEqual(verifyIdToken(make(claims, header, other.privateKey), keys, opts), { ok: false, error: 'signature' });
  const [h, , s] = make().split('.');
  const changed = Buffer.from(JSON.stringify({ ...claims, sub: 'u-1002' })).toString('base64url');
  assert.deepEqual(verifyIdToken(`${h}.${changed}.${s}`, keys, opts), { ok: false, error: 'signature' });
});

test('iss・aud が違う。aud が配列なら azp が自分であること', () => {
  assert.deepEqual(verifyIdToken(make({ ...claims, iss: 'http://127.0.0.1:9641' }), keys, opts), { ok: false, error: 'iss' });
  assert.deepEqual(verifyIdToken(make({ ...claims, aud: 'other-app' }), keys, opts), { ok: false, error: 'aud' });
  assert.equal(verifyIdToken(make({ ...claims, aud: ['task-app'] }), keys, opts).ok, true);
  assert.deepEqual(verifyIdToken(make({ ...claims, aud: ['task-app', 'other-app'] }), keys, opts), { ok: false, error: 'aud' });
  assert.equal(verifyIdToken(make({ ...claims, aud: ['task-app', 'other-app'], azp: 'task-app' }), keys, opts).ok, true);
});

test('expired: exp + leewaySec（既定 60）を過ぎたら。exp が無いのも expired', () => {
  const t = make();
  assert.equal(verifyIdToken(t, keys, { ...opts, now: (NOW_SEC + 359) * 1000 }).ok, true);
  assert.deepEqual(verifyIdToken(t, keys, { ...opts, now: (NOW_SEC + 360) * 1000 }), { ok: false, error: 'expired' });
  assert.deepEqual(verifyIdToken(t, keys, { ...opts, now: (NOW_SEC + 301) * 1000, leewaySec: 0 }), { ok: false, error: 'expired' });
  const { exp: _e, ...noExp } = claims;
  assert.deepEqual(verifyIdToken(make(noExp), keys, opts), { ok: false, error: 'expired' });
});

test('iat: 未来に発行されたことになっているもの（leewaySec をこえて）', () => {
  assert.deepEqual(verifyIdToken(make({ ...claims, iat: NOW_SEC + 120 }), keys, opts), { ok: false, error: 'iat' });
  assert.equal(verifyIdToken(make({ ...claims, iat: NOW_SEC + 30 }), keys, opts).ok, true);
});

test('nonce: 違う・無い', () => {
  assert.deepEqual(verifyIdToken(make({ ...claims, nonce: 'n-2' }), keys, opts), { ok: false, error: 'nonce' });
  const { nonce: _n, ...noNonce } = claims;
  assert.deepEqual(verifyIdToken(make(noNonce), keys, opts), { ok: false, error: 'nonce' });
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
