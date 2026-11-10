// 練習問題2 用: form-fields.mjs のテスト
// 使い方: node --test form-fields.test.mjs
//   模範解答を試す: MODULE=../solutions/form-fields.mjs node --test form-fields.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { readContactForm } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './form-fields.mjs')).href);

test('すべての項目がそろったフォーム', () => {
  assert.deepEqual(readContactForm('name=alice&message=hello&tags=js&tags=node&agree=on'), {
    name: 'alice',
    message: 'hello',
    tags: ['js', 'node'],
    agree: true,
  });
});

test('+ は空白、%xx は文字に戻す', () => {
  const r = readContactForm('name=%E3%81%AD%E3%81%93&message=a+b%2Bc%26d%3De%0D%0A2%E8%A1%8C%E7%9B%AE');
  assert.equal(r.name, 'ねこ');
  assert.equal(r.message, 'a b+c&d=e\r\n2行目');
});

test('前後の空白は取る', () => {
  assert.equal(readContactForm('name=++bob++').name, 'bob');
});

test('無い項目は、空の文字列・空の配列・false', () => {
  assert.deepEqual(readContactForm(''), { name: '', message: '', tags: [], agree: false });
});

test('agree は、名前があれば（値が何でも）true', () => {
  assert.equal(readContactForm('agree=on').agree, true);
  assert.equal(readContactForm('agree=').agree, true);
  assert.equal(readContactForm('agreed=on').agree, false);
});

test('同じ名前が何回あっても、name と message は最初の1つ', () => {
  const r = readContactForm('name=carol&name=dave');
  assert.equal(r.name, 'carol');
});
