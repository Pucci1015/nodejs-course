// 練習問題2 用: inside-check.mjs のテスト
// 使い方: node --test inside-check.test.mjs
//   模範解答を試す: MODULE=../solutions/inside-check.mjs node --test inside-check.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { isInside, isHidden } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './inside-check.mjs')).href);

const ROOT = '/srv/site/public';

test('isInside: 中のファイル・フォルダは true', () => {
  assert.equal(isInside(ROOT, '/srv/site/public/index.html'), true);
  assert.equal(isInside(ROOT, '/srv/site/public/img/logo.svg'), true);
});

test('isInside: 公開するフォルダそのものも true', () => {
  assert.equal(isInside(ROOT, '/srv/site/public'), true);
  assert.equal(isInside(ROOT, '/srv/site/public/'), true);
});

test('isInside: 外は false', () => {
  assert.equal(isInside(ROOT, '/srv/site/outside.txt'), false);
  assert.equal(isInside(ROOT, '/srv/site'), false);
  assert.equal(isInside(ROOT, '/etc/passwd'), false);
});

test('isInside: .. を含むパスは、計算した後の場所で決める', () => {
  assert.equal(isInside(ROOT, '/srv/site/public/img/../hello.txt'), true);
  assert.equal(isInside(ROOT, '/srv/site/public/../outside.txt'), false);
});

test('isInside: 名前が同じ文字で始まる、となりのフォルダは false', () => {
  assert.equal(isInside(ROOT, '/srv/site/public-backup/secret.txt'), false);
});

test('isInside: .. で始まる名前のファイル（..memo.txt）は、中にあれば true', () => {
  assert.equal(isInside(ROOT, '/srv/site/public/..memo.txt'), true);
});

test('isHidden: . で始まる名前を含めば true', () => {
  assert.equal(isHidden('/.env'), true);
  assert.equal(isHidden('/.git/config'), true);
  assert.equal(isHidden('/img/.DS_Store'), true);
});

test('isHidden: 含まなければ false', () => {
  assert.equal(isHidden('/index.html'), false);
  assert.equal(isHidden('/img/logo.svg'), false);
  assert.equal(isHidden('/'), false);
});
