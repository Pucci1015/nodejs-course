// 練習問題2 のテスト
// 使い方: node --test phc.test.ts
//   模範解答を試す: MODULE=../solutions/phc.ts node --test phc.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './phc.ts');
const { formatPhc, parsePhc }: typeof import('./phc.ts') = await import(pathToFileURL(file).href);

const salt = Buffer.from('0123456789abcdef'); // 16バイト
const hash = Buffer.alloc(32, 7); // 32バイト

test('formatPhc: 決まった形の文字列を作る。最後の = は付けない', () => {
  assert.equal(
    formatPhc({ m: 19456, t: 2, p: 1 }, salt, hash),
    '$argon2id$v=19$m=19456,t=2,p=1$MDEyMzQ1Njc4OWFiY2RlZg$BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc',
  );
});

test('parsePhc: formatPhc の逆', () => {
  const parsed = parsePhc(formatPhc({ m: 65536, t: 3, p: 4 }, salt, hash));
  assert.ok(parsed);
  assert.equal(parsed.m, 65536);
  assert.equal(parsed.t, 3);
  assert.equal(parsed.p, 4);
  assert.deepEqual(parsed.salt, salt);
  assert.deepEqual(parsed.hash, hash);
});

test('parsePhc: 形が違えば null', () => {
  const ok = formatPhc({ m: 19456, t: 2, p: 1 }, salt, hash);
  assert.equal(parsePhc(ok.replace('argon2id', 'argon2i')), null, '種類が違う');
  assert.equal(parsePhc(ok.replace('v=19', 'v=16')), null, '版が違う');
  assert.equal(parsePhc(ok.replace('m=19456', 'm=abc')), null, '数でない');
  assert.equal(parsePhc(ok.replace(',p=1', '')), null, 'p が無い');
  assert.equal(parsePhc(`${ok}$extra`), null, '区切りが多い');
  assert.equal(parsePhc(ok.slice(1)), null, '最初の $ が無い');
  assert.equal(parsePhc(ok.replace('MDEy', 'MD!y')), null, 'base64 でない文字');
  assert.equal(parsePhc(''), null);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
