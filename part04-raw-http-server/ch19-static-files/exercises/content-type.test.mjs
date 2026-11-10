// 練習問題1 用: content-type.mjs のテスト
// 使い方: node --test content-type.test.mjs
//   模範解答を試す: MODULE=../solutions/content-type.mjs node --test content-type.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { contentTypeOf } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './content-type.mjs')).href);

test('文字のファイルは charset=utf-8 付き', () => {
  assert.equal(contentTypeOf('index.html'), 'text/html; charset=utf-8');
  assert.equal(contentTypeOf('style.css'), 'text/css; charset=utf-8');
  assert.equal(contentTypeOf('app.js'), 'text/javascript; charset=utf-8');
  assert.equal(contentTypeOf('data.json'), 'application/json; charset=utf-8');
  assert.equal(contentTypeOf('hello.txt'), 'text/plain; charset=utf-8');
});

test('画像', () => {
  assert.equal(contentTypeOf('logo.svg'), 'image/svg+xml');
  assert.equal(contentTypeOf('photo.png'), 'image/png');
  assert.equal(contentTypeOf('photo.jpg'), 'image/jpeg');
  assert.equal(contentTypeOf('photo.jpeg'), 'image/jpeg');
});

test('拡張子の大文字・小文字は区別しない', () => {
  assert.equal(contentTypeOf('LOGO.PNG'), 'image/png');
  assert.equal(contentTypeOf('Index.Html'), 'text/html; charset=utf-8');
});

test('フォルダの付いたパスでも、最後の拡張子で決める', () => {
  assert.equal(contentTypeOf('/srv/public/img/logo.svg'), 'image/svg+xml');
  assert.equal(contentTypeOf('archive.tar.gz'), 'application/octet-stream');
});

test('知らない拡張子・拡張子が無いものは application/octet-stream', () => {
  assert.equal(contentTypeOf('notes.md'), 'application/octet-stream');
  assert.equal(contentTypeOf('Makefile'), 'application/octet-stream');
  assert.equal(contentTypeOf('.env'), 'application/octet-stream');
});

test('constructor のような名前の拡張子でも、application/octet-stream', () => {
  assert.equal(contentTypeOf('x.constructor'), 'application/octet-stream');
  assert.equal(contentTypeOf('x.toString'), 'application/octet-stream');
});
