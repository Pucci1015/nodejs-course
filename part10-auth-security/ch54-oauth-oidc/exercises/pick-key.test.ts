// 練習問題3 のテスト
// 使い方: node --test pick-key.test.ts
//   模範解答を試す: MODULE=../solutions/pick-key.ts node --test pick-key.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPublicKey, generateKeyPairSync, type JsonWebKey, type KeyObject } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeKey } from './keys.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './pick-key.ts');
const { pickKey }: typeof import('./pick-key.ts') = await import(pathToFileURL(file).href);

const k1 = makeKey('k1');
const k2 = makeKey('k2');
const same = (a: KeyObject | null, jwk: JsonWebKey) => {
  assert.ok(a !== null, '鍵が返っていません');
  assert.ok(createPublicKey({ key: jwk, format: 'jwk' }).equals(a), '違う鍵です');
};

test('kid が合う鍵を、KeyObject（createPublicKey の結果）で返す', () => {
  same(pickKey([k1.jwk, k2.jwk], { alg: 'RS256', kid: 'k2' }), k2.jwk);
  same(pickKey([k1.jwk, k2.jwk], { alg: 'RS256', kid: 'k1' }), k1.jwk);
});

test('alg が RS256 でなければ null（none・HS256・無い）', () => {
  for (const alg of ['none', 'HS256', 'RS512', undefined]) assert.equal(pickKey([k1.jwk], { alg, kid: 'k1' }), null, String(alg));
});

test('kid が合う鍵が無ければ null', () => {
  assert.equal(pickKey([k1.jwk, k2.jwk], { alg: 'RS256', kid: 'k3' }), null);
});

test('kid が無いときは、使える鍵が1つだけならそれ、2つ以上なら null', () => {
  same(pickKey([k1.jwk], { alg: 'RS256' }), k1.jwk);
  assert.equal(pickKey([k1.jwk, k2.jwk], { alg: 'RS256' }), null);
});

test('RSA でない鍵、use が sig でない鍵、alg が RS256 でない鍵は使わない', () => {
  const ec = { ...generateKeyPairSync('ec', { namedCurve: 'P-256' }).publicKey.export({ format: 'jwk' }), kid: 'k1' };
  assert.equal(pickKey([ec], { alg: 'RS256', kid: 'k1' }), null);
  assert.equal(pickKey([{ ...k1.jwk, use: 'enc' }], { alg: 'RS256', kid: 'k1' }), null);
  assert.equal(pickKey([{ ...k1.jwk, alg: 'PS256' }], { alg: 'RS256', kid: 'k1' }), null);
  // use・alg が書いていない鍵は使ってよい
  const { use: _u, alg: _a, ...plain } = k1.jwk;
  same(pickKey([plain], { alg: 'RS256', kid: 'k1' }), k1.jwk);
});

test('壊れた鍵（n が無い）なら、例外ではなく null', () => {
  const { n: _n, ...broken } = k1.jwk;
  assert.equal(pickKey([broken], { alg: 'RS256', kid: 'k1' }), null);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
