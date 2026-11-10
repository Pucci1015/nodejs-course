// 練習問題3 用: read-query.mjs のテスト
// 使い方: node --test read-query.test.mjs
//   模範解答を試す: MODULE=../solutions/read-query.mjs node --test read-query.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './read-query.mjs')).href);
const q = (s) => new URLSearchParams(s);

test('readPage: 書かれていなければ 1', () => {
  assert.equal(m.readPage(null), 1);
});

test('readPage: 1〜1000 の整数なら、その数', () => {
  assert.equal(m.readPage('1'), 1);
  assert.equal(m.readPage('25'), 25);
  assert.equal(m.readPage('1000'), 1000);
});

test('readPage: それ以外は null', () => {
  for (const bad of ['', '0', '-1', '1.5', 'abc', '1e3', ' 3', '007', '1001']) {
    assert.equal(m.readPage(bad), null, JSON.stringify(bad));
  }
});

test('readSort: 書かれていなければ new。new と old はそのまま。それ以外は null', () => {
  assert.equal(m.readSort(null), 'new');
  assert.equal(m.readSort('new'), 'new');
  assert.equal(m.readSort('old'), 'old');
  assert.equal(m.readSort(''), null);
  assert.equal(m.readSort('NEW'), null);
});

test('readListQuery: 正しければ ok: true と値', () => {
  assert.deepEqual(m.readListQuery(q('page=2&sort=old')), { ok: true, page: 2, sort: 'old' });
  assert.deepEqual(m.readListQuery(q('')), { ok: true, page: 1, sort: 'new' });
});

test('readListQuery: 間違いは ok: false と、全部の間違いの文', () => {
  assert.deepEqual(m.readListQuery(q('page=abc')), { ok: false, errors: ['page は 1〜1000 の整数で指定してください'] });
  assert.deepEqual(m.readListQuery(q('page=0&sort=x')), {
    ok: false,
    errors: ['page は 1〜1000 の整数で指定してください', 'sort は new か old で指定してください'],
  });
});
