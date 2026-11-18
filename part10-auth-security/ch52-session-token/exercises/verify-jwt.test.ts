// 練習問題6 のテスト
// 使い方: node --test verify-jwt.test.ts
//   模範解答を試す: MODULE=../solutions/verify-jwt.ts node --test verify-jwt.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './verify-jwt.ts');
const { verifyJwt }: typeof import('./verify-jwt.ts') = await import(pathToFileURL(file).href);

const SECRET = 'dev-only-jwt-secret-at-least-32-bytes!';
const NOW = Date.UTC(2026, 10, 18, 9, 0, 0);
const NOW_SEC = NOW / 1000;

/** テスト用に、好きなヘッダと中身で JWT を作る */
function make(payload: Record<string, unknown>, header: Record<string, unknown> = { alg: 'HS256', typ: 'JWT' }, secret = SECRET) {
  const enc = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const data = `${enc(header)}.${enc(payload)}`;
  return `${data}.${createHmac('sha256', secret).update(data).digest('base64url')}`;
}

const base = { sub: '1', iat: NOW_SEC, exp: NOW_SEC + 900 };

test('正しいトークン: { ok: true, claims }', () => {
  assert.deepEqual(verifyJwt(make(base), SECRET, { now: NOW }), { ok: true, claims: base });
});

test('malformed: 3つに分かれていない・JSON でない・オブジェクトでない', () => {
  const good = make(base);
  const [h = '', p = '', s = ''] = good.split('.');
  const bad = [
    'abc',
    `${h}.${p}`,
    `${good}.x`,
    `${h}.${Buffer.from('not json').toString('base64url')}.${s}`,
    `${h}.${Buffer.from('[1]').toString('base64url')}.${s}`,
    `${h}.${p}.`,
    `${h}=.${p}.${s}`,
  ];
  for (const token of bad) assert.deepEqual(verifyJwt(token, SECRET, { now: NOW }), { ok: false, error: 'malformed' }, token);
});

test('alg: HS256 以外（none・HS512・無い）は断る', () => {
  for (const header of [{ alg: 'none' }, { alg: 'HS512' }, { typ: 'JWT' }]) {
    assert.deepEqual(verifyJwt(make(base, header), SECRET, { now: NOW }), { ok: false, error: 'alg' }, JSON.stringify(header));
  }
});

test('signature: 違う鍵・中身を変えた', () => {
  assert.deepEqual(verifyJwt(make(base, undefined, 'dev-only-another-secret-32-bytes!!'), SECRET, { now: NOW }), {
    ok: false,
    error: 'signature',
  });
  const [h, , s] = make(base).split('.');
  const changed = Buffer.from(JSON.stringify({ ...base, sub: '2' })).toString('base64url');
  assert.deepEqual(verifyJwt(`${h}.${changed}.${s}`, SECRET, { now: NOW }), { ok: false, error: 'signature' });
});

test('expired: exp の時刻ちょうどから切れている。leewaySec だけ許す', () => {
  const token = make(base);
  assert.deepEqual(verifyJwt(token, SECRET, { now: (NOW_SEC + 899) * 1000 }).ok, true);
  assert.deepEqual(verifyJwt(token, SECRET, { now: (NOW_SEC + 900) * 1000 }), { ok: false, error: 'expired' });
  assert.equal(verifyJwt(token, SECRET, { now: (NOW_SEC + 920) * 1000, leewaySec: 30 }).ok, true);
});

test('claim: exp が無い・数でない', () => {
  assert.deepEqual(verifyJwt(make({ sub: '1' }), SECRET, { now: NOW }), { ok: false, error: 'claim' });
  assert.deepEqual(verifyJwt(make({ sub: '1', exp: 'later' }), SECRET, { now: NOW }), { ok: false, error: 'claim' });
});

test('not_yet_valid: nbf より前は使えない（leewaySec だけ許す）', () => {
  const token = make({ ...base, nbf: NOW_SEC + 60 });
  assert.deepEqual(verifyJwt(token, SECRET, { now: NOW }), { ok: false, error: 'not_yet_valid' });
  assert.equal(verifyJwt(token, SECRET, { now: NOW, leewaySec: 60 }).ok, true);
  assert.equal(verifyJwt(token, SECRET, { now: NOW + 60_000 }).ok, true);
});

test('claim: issuer・audience を指定したら、iss・aud が合わなければ断る（aud は配列でもよい）', () => {
  const token = make({ ...base, iss: 'https://api.example.test', aud: ['task-web', 'task-cli'] });
  assert.equal(verifyJwt(token, SECRET, { now: NOW, issuer: 'https://api.example.test', audience: 'task-cli' }).ok, true);
  assert.deepEqual(verifyJwt(token, SECRET, { now: NOW, issuer: 'https://other.example.test' }), { ok: false, error: 'claim' });
  assert.deepEqual(verifyJwt(token, SECRET, { now: NOW, audience: 'admin' }), { ok: false, error: 'claim' });
  const one = make({ ...base, aud: 'task-web' });
  assert.equal(verifyJwt(one, SECRET, { now: NOW, audience: 'task-web' }).ok, true);
  assert.deepEqual(verifyJwt(make(base), SECRET, { now: NOW, audience: 'task-web' }), { ok: false, error: 'claim' });
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
