// 練習問題3 用: etag.mjs のテスト
// 使い方: node --test etag.test.mjs
//   模範解答を試す: MODULE=../solutions/etag.mjs node --test etag.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { weakEtag, isNotModified } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './etag.mjs')).href);

test('weakEtag: W/"大きさ-時刻" を 16 進数で作る', () => {
  assert.equal(weakEtag({ size: 255, mtimeMs: 4096 }), 'W/"ff-1000"');
  assert.equal(weakEtag({ size: 0, mtimeMs: 1 }), 'W/"0-1"');
});

test('weakEtag: 時刻のミリ秒より細かい部分は切り捨てる', () => {
  assert.equal(weakEtag({ size: 10, mtimeMs: 1762713057123.789 }), `W/"a-${(1762713057123).toString(16)}"`);
});

test('weakEtag: 大きさか時刻が変われば、違う ETag になる', () => {
  const a = weakEtag({ size: 100, mtimeMs: 1000 });
  assert.notEqual(a, weakEtag({ size: 101, mtimeMs: 1000 }));
  assert.notEqual(a, weakEtag({ size: 100, mtimeMs: 2000 }));
});

test('isNotModified: If-None-Match が無ければ false', () => {
  assert.equal(isNotModified(undefined, '"abc"'), false);
  assert.equal(isNotModified(null, '"abc"'), false);
});

test('isNotModified: 同じ ETag なら true、違えば false', () => {
  assert.equal(isNotModified('"abc"', '"abc"'), true);
  assert.equal(isNotModified('"abd"', '"abc"'), false);
});

test('isNotModified: W/ は無視して比べる（弱い比較）', () => {
  assert.equal(isNotModified('W/"abc"', '"abc"'), true);
  assert.equal(isNotModified('"abc"', 'W/"abc"'), true);
  assert.equal(isNotModified('W/"abc"', 'W/"abc"'), true);
});

test('isNotModified: , で並んだどれかと同じなら true', () => {
  assert.equal(isNotModified('"x", W/"abc" ,"y"', 'W/"abc"'), true);
  assert.equal(isNotModified('"x", "y"', 'W/"abc"'), false);
});

test('isNotModified: * は、どの ETag でも true', () => {
  assert.equal(isNotModified('*', 'W/"abc"'), true);
});
