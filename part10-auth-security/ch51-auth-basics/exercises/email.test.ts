// 練習問題1 のテスト
// 使い方: node --test email.test.ts
//   模範解答を試す: MODULE=../solutions/email.ts node --test email.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './email.ts');
const { normalizeEmail }: typeof import('./email.ts') = await import(pathToFileURL(file).href);

test('前後の空白を除き、小文字にそろえる', () => {
  assert.equal(normalizeEmail('alice@example.com'), 'alice@example.com');
  assert.equal(normalizeEmail('  Alice@Example.COM '), 'alice@example.com');
});

test('メールアドレスの形でなければ null', () => {
  assert.equal(normalizeEmail('alice'), null);
  assert.equal(normalizeEmail('alice@'), null);
  assert.equal(normalizeEmail('al ice@example.com'), null);
  assert.equal(normalizeEmail(''), null);
});

test('文字列でなければ null', () => {
  assert.equal(normalizeEmail(42), null);
  assert.equal(normalizeEmail(undefined), null);
  assert.equal(normalizeEmail(['alice@example.com']), null);
});

test('254 文字より長ければ null', () => {
  const long = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.com`; // 259 文字
  assert.equal(normalizeEmail(long), null);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
