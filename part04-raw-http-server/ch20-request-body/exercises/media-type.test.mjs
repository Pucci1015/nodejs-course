// 練習問題1 用: media-type.mjs のテスト
// 使い方: node --test media-type.test.mjs
//   模範解答を試す: MODULE=../solutions/media-type.mjs node --test media-type.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './media-type.mjs')).href);

test('mediaTypeOf: ; より前を返す', () => {
  assert.equal(m.mediaTypeOf('application/json; charset=utf-8'), 'application/json');
  assert.equal(m.mediaTypeOf('text/plain'), 'text/plain');
});

test('mediaTypeOf: 前後の空白を取り、小文字にする', () => {
  assert.equal(m.mediaTypeOf(' Application/JSON ;charset=UTF-8'), 'application/json');
});

test('mediaTypeOf: ヘッダが無ければ空の文字列', () => {
  assert.equal(m.mediaTypeOf(undefined), '');
  assert.equal(m.mediaTypeOf(''), '');
});

test('isJson: application/json なら true', () => {
  assert.equal(m.isJson('application/json'), true);
  assert.equal(m.isJson('application/json; charset=utf-8'), true);
  assert.equal(m.isJson('APPLICATION/JSON'), true);
});

test('isJson: それ以外は false', () => {
  assert.equal(m.isJson('text/plain'), false);
  assert.equal(m.isJson('application/jsonx'), false);
  assert.equal(m.isJson(undefined), false);
});

test('isForm: application/x-www-form-urlencoded なら true、それ以外は false', () => {
  assert.equal(m.isForm('application/x-www-form-urlencoded'), true);
  assert.equal(m.isForm('application/x-www-form-urlencoded; charset=UTF-8'), true);
  assert.equal(m.isForm('multipart/form-data; boundary=abc'), false);
  assert.equal(m.isForm(undefined), false);
});
