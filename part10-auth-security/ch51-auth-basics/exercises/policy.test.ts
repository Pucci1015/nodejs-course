// 練習問題3 のテスト
// 使い方: node --test policy.test.ts
//   模範解答を試す: MODULE=../solutions/policy.ts node --test policy.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './policy.ts');
const { checkPassword }: typeof import('./policy.ts') = await import(pathToFileURL(file).href);

const policy = { min: 12, max: 64, common: new Set(['password1234', 'qwertyuiop12']) };

test('決まりに合えば、空の配列', () => {
  assert.deepEqual(checkPassword('neko-to-inu-to-tori', 'alice@example.com', policy), []);
});

test('短い・長い', () => {
  assert.deepEqual(checkPassword('short', 'alice@example.com', policy), ['too_short']);
  assert.deepEqual(checkPassword('x'.repeat(65), 'alice@example.com', policy), ['too_long']);
  assert.deepEqual(checkPassword('x'.repeat(64), 'alice@example.com', policy), []);
});

test('長さは文字の数で数える（絵文字は1文字）', () => {
  assert.deepEqual(checkPassword('🐱'.repeat(12), 'alice@example.com', policy), []);
  assert.deepEqual(checkPassword('🐱'.repeat(11), 'alice@example.com', policy), ['too_short']);
});

test('よく使われるもの。大文字・全角でも見つける（NFKC と小文字）', () => {
  assert.deepEqual(checkPassword('password1234', 'alice@example.com', policy), ['common']);
  assert.deepEqual(checkPassword('PASSWORD1234', 'alice@example.com', policy), ['common']);
  assert.deepEqual(checkPassword('ｑｗｅｒｔｙｕｉｏｐ１２', 'alice@example.com', policy), ['common']);
});

test('メールアドレスの @ の前（3文字以上）を含む', () => {
  assert.deepEqual(checkPassword('i-am-Alice-2026', 'alice@example.com', policy), ['contains_email']);
  assert.deepEqual(checkPassword('ab-ab-ab-ab-ab', 'ab@example.com', policy), [], '2文字なら確かめない');
});

test('当てはまるものは全部、決まった順で', () => {
  assert.deepEqual(checkPassword('alice', 'alice@example.com', policy), ['too_short', 'contains_email']);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
