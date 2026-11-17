// 練習問題5 のテスト
// 使い方: node --test rehash.test.ts
//   模範解答を試す: MODULE=../solutions/rehash.ts node --test rehash.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { hashPassword, PARAMS, verifyPassword } from './password.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './rehash.ts');
const { needsRehash, verifyAndUpgrade }: typeof import('./rehash.ts') = await import(pathToFileURL(file).href);

/** 軽い設定で作った、昔のハッシュ（パスワードは neko-daisuki-2026） */
const OLD = '$argon2id$v=19$m=4096,t=1,p=1$c2FsdHNhbHRzYWx0c2FsdA$avFMEyvH737fQbkfRHTc0y6jEKFWKNiIIfVIAgXgHGU';

test('needsRehash: 今の設定（PARAMS）と同じなら false', async () => {
  assert.equal(needsRehash(await hashPassword('neko-daisuki-2026')), false);
});

test('needsRehash: m か t が今より小さい・p が違うなら true', () => {
  assert.equal(needsRehash(OLD), true);
  const base = `$argon2id$v=19$m=${PARAMS.m},t=${PARAMS.t},p=${PARAMS.p}$c2FsdA$aGFzaA`;
  assert.equal(needsRehash(base), false);
  assert.equal(needsRehash(base.replace(`t=${PARAMS.t}`, 't=1')), true);
  assert.equal(needsRehash(base.replace(`p=${PARAMS.p}`, 'p=2')), true);
  assert.equal(needsRehash(base, { m: PARAMS.m * 2, t: PARAMS.t, p: PARAMS.p }), true, '2つ目の引数で今の設定を渡せる');
  assert.equal(needsRehash(base.replace(`m=${PARAMS.m}`, `m=${PARAMS.m * 2}`)), false, '今より重いものは作り直さない');
});

test('needsRehash: 読めない文字列は true', () => {
  assert.equal(needsRehash('plain-text'), true);
});

test('verifyAndUpgrade: 合っていて古ければ、新しいハッシュを返す', async () => {
  const result = await verifyAndUpgrade(OLD, 'neko-daisuki-2026');
  assert.equal(result.ok, true);
  assert.ok(result.newHash);
  assert.equal(needsRehash(result.newHash), false);
  assert.equal(await verifyPassword(result.newHash, 'neko-daisuki-2026'), true);
});

test('verifyAndUpgrade: 合っていて新しければ newHash は null', async () => {
  const stored = await hashPassword('neko-daisuki-2026');
  assert.deepEqual(await verifyAndUpgrade(stored, 'neko-daisuki-2026'), { ok: true, newHash: null });
});

test('verifyAndUpgrade: 違うパスワードなら、作り直さない', async () => {
  assert.deepEqual(await verifyAndUpgrade(OLD, 'wrong-password'), { ok: false, newHash: null });
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
