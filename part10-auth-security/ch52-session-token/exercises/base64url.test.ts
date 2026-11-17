// 練習問題2 のテスト
// 使い方: node --test base64url.test.ts
//   模範解答を試す: MODULE=../solutions/base64url.ts node --test base64url.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './base64url.ts');
const { encodePart, decodePart }: typeof import('./base64url.ts') = await import(pathToFileURL(file).href);

test('encodePart: JWT のヘッダと同じ文字列になる', () => {
  assert.equal(encodePart({ alg: 'HS256', typ: 'JWT' }), 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
});

test('encodePart: = が付かず、+ / の代わりに - _ を使う', () => {
  const text = encodePart({ name: 'ねこ?>>' });
  assert.doesNotMatch(text, /[=+/]/);
  assert.equal(text, 'eyJuYW1lIjoi44Gt44GTPz4-In0');
});

test('decodePart: encodePart の逆（日本語も）', () => {
  const value = { sub: '1', email: 'alice@example.com', name: 'ねこ', n: 3 };
  assert.deepEqual(decodePart(encodePart(value)), value);
});

test('decodePart: base64url で使わない文字（= + / 空白）があれば null', () => {
  const good = encodePart({ a: 1 });
  for (const bad of [`${good}=`, good.replace('e', '+'), good.replace('e', '/'), ` ${good}`, '']) {
    assert.equal(decodePart(bad), null, JSON.stringify(bad));
  }
});

test('decodePart: 長さが 4 で割って 1 余るなら null', () => {
  assert.equal(decodePart('eyJhIjoxfQA'.slice(0, 9)), null);
});

test('decodePart: JSON でない・オブジェクトでない（配列・数・null・文字列）なら null', () => {
  const enc = (s: string) => Buffer.from(s).toString('base64url');
  for (const s of ['not json', '[1,2]', '42', 'null', '"text"']) {
    assert.equal(decodePart(enc(s)), null, s);
  }
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
