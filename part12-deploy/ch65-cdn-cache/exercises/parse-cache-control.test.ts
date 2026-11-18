// 練習問題2 のテスト
// 使い方: node --test parse-cache-control.test.ts
//   模範解答を試す: MODULE=../solutions/parse-cache-control.ts node --test parse-cache-control.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './parse-cache-control.ts');
const { parseCacheControl, sharedLifetime }: typeof import('./parse-cache-control.ts') = await import(pathToFileURL(file).href);

const obj = (v: string | undefined) => Object.fromEntries(parseCacheControl(v));

test('名前と値に分ける。名前は小文字、まわりの空白は取る', () => {
  assert.deepEqual(obj('Public,  Max-Age=60 ,immutable'), { public: '', 'max-age': '60', immutable: '' });
});

test('"…" で囲んだ値は、囲みを取る。中のカンマで切らない', () => {
  assert.deepEqual(obj('no-cache="Set-Cookie, X-Foo", max-age=5'), { 'no-cache': 'Set-Cookie, X-Foo', 'max-age': '5' });
  assert.deepEqual(obj('private="a=b"'), { private: 'a=b' });
});

test('空の部分は飛ばす。同じ名前が2回あれば、最初のものを使う', () => {
  assert.deepEqual(obj(' , max-age=10,, max-age=99 ,'), { 'max-age': '10' });
});

test('undefined と空の文字列は、空の Map', () => {
  assert.equal(parseCacheControl(undefined).size, 0);
  assert.equal(parseCacheControl('').size, 0);
});

test('sharedLifetime: s-maxage を先に、無ければ max-age', () => {
  assert.equal(sharedLifetime('public, max-age=0, s-maxage=60'), 60);
  assert.equal(sharedLifetime('max-age=300'), 300);
  assert.equal(sharedLifetime('S-MaxAge=7'), 7);
});

test('sharedLifetime: no-store・private は undefined、no-cache は 0、書いていなければ undefined', () => {
  assert.equal(sharedLifetime('private, max-age=60'), undefined);
  assert.equal(sharedLifetime('no-store'), undefined);
  assert.equal(sharedLifetime('no-cache'), 0);
  assert.equal(sharedLifetime('public'), undefined);
  assert.equal(sharedLifetime(undefined), undefined);
});

test('sharedLifetime: 数字だけでない値（-1、1.5、空）は、無いものとして扱う', () => {
  assert.equal(sharedLifetime('s-maxage=-1, max-age=30'), 30);
  assert.equal(sharedLifetime('max-age=1.5'), undefined);
  assert.equal(sharedLifetime('max-age='), undefined);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
