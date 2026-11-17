// 練習問題2 のテスト
// 使い方: node --test basic-auth.test.ts
//   模範解答を試す: MODULE=../solutions/basic-auth.ts node --test basic-auth.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './basic-auth.ts');
const { basicAuthHeader, parseBasicAuth }: typeof import('./basic-auth.ts') = await import(pathToFileURL(file).href);

const decode = (header: string) => Buffer.from(header.replace(/^Basic /, ''), 'base64').toString();

test('ふつうの値: 「id:secret」を base64 にして Basic を付ける', () => {
  assert.equal(basicAuthHeader('task-app', 'dev-only-client-secret'), 'Basic dGFzay1hcHA6ZGV2LW9ubHktY2xpZW50LXNlY3JldA==');
});

test(': や空白・日本語は、先にフォームの形の符号（: は %3A、空白は +）にする', () => {
  assert.equal(decode(basicAuthHeader('task app', 'dev-only:secret word')), 'task+app:dev-only%3Asecret+word');
  assert.equal(decode(basicAuthHeader('ねこ', 'a&b=c')), '%E3%81%AD%E3%81%93:a%26b%3Dc');
});

test('parseBasicAuth は basicAuthHeader の逆', () => {
  for (const [id, secret] of [
    ['task-app', 'dev-only-client-secret'],
    ['task app', 'dev-only:secret word'],
    ['ねこ', 'a&b=c+d%'],
  ] as const) {
    assert.deepEqual(parseBasicAuth(basicAuthHeader(id, secret)), { clientId: id, clientSecret: secret });
  }
});

test('parseBasicAuth: 小文字の basic も読む', () => {
  assert.deepEqual(parseBasicAuth('basic dGFzay1hcHA6eA=='), { clientId: 'task-app', clientSecret: 'x' });
});

test('parseBasicAuth: 形が違えば null', () => {
  for (const bad of ['', 'Bearer abc', 'Basic', 'Basic !!!', `Basic ${Buffer.from('no-colon').toString('base64')}`, `Basic ${Buffer.from(':secret').toString('base64')}`]) {
    assert.equal(parseBasicAuth(bad), null, bad);
  }
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
