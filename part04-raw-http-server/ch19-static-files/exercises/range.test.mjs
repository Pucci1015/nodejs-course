// 練習問題4のテスト
// 使い方: node --test range.test.mjs
//         MODULE=../solutions/range.mjs node --test range.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { parseRange } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './range.mjs')).href);

test('Range が無ければ null', () => {
  assert.equal(parseRange(undefined, 1000), null);
});

test('始め-終わり（終わりを含む）', () => {
  assert.deepEqual(parseRange('bytes=0-99', 1000), { start: 0, end: 99 });
  assert.deepEqual(parseRange('bytes=0-0', 1000), { start: 0, end: 0 });
  assert.deepEqual(parseRange(' bytes=10-19 ', 1000), { start: 10, end: 19 });
});

test('始め-（最後まで）', () => {
  assert.deepEqual(parseRange('bytes=500-', 1000), { start: 500, end: 999 });
});

test('-長さ（最後の何バイト）', () => {
  assert.deepEqual(parseRange('bytes=-200', 1000), { start: 800, end: 999 });
  assert.deepEqual(parseRange('bytes=-2000', 1000), { start: 0, end: 999 }); // ファイルより長ければ全部
});

test('終わりがファイルより後ろなら、最後までにする', () => {
  assert.deepEqual(parseRange('bytes=990-5000', 1000), { start: 990, end: 999 });
  assert.deepEqual(parseRange('bytes=0-99999999999999999999', 1000), { start: 0, end: 999 });
});

test('ファイルの中に1バイトも無い範囲は unsatisfiable（416）', () => {
  assert.equal(parseRange('bytes=1000-', 1000), 'unsatisfiable');
  assert.equal(parseRange('bytes=1000-2000', 1000), 'unsatisfiable');
  assert.equal(parseRange('bytes=-0', 1000), 'unsatisfiable');
  assert.equal(parseRange('bytes=0-', 0), 'unsatisfiable'); // 空のファイル
  assert.equal(parseRange('bytes=-5', 0), 'unsatisfiable');
});

test('読めない形・対応しない形は null（Range を無視して、全部を 200 で返す）', () => {
  for (const h of ['bytes=5-2', 'bytes=0-1,5-6', 'items=0-1', 'bytes=abc', 'bytes=-', 'bytes=', 'bytes=1-2-3', 'bytes=+1-2', 'bytes=0x10-', 'bytes=1.5-2']) {
    assert.equal(parseRange(h, 1000), null, h);
  }
});

test('とても大きな始まりは、範囲として返さない', () => {
  const r = parseRange('bytes=99999999999999999999-', 1000);
  assert.ok(r === null || r === 'unsatisfiable', String(r));
});
