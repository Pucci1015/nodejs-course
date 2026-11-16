// 練習問題2 用: change-queries.mjs のテスト
// 使い方: node --test change-queries.test.mjs
//   模範解答を試す: MODULE=../solutions/change-queries.mjs node --test change-queries.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createBooksDb } from './books.mjs';

const q = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './change-queries.mjs')).href);

const rows = (db, sql) => db.prepare(sql).all().map((row) => ({ ...row }));

test('addBook: 庭づくり（eve、2026 年、150 ページ、hobby）が1冊増える。id は 11、read_at と rating は NULL', () => {
  const db = createBooksDb();
  const r = db.prepare(q.addBook).run();
  assert.equal(r.changes, 1);
  assert.deepEqual(rows(db, 'SELECT * FROM books WHERE id = 11'), [
    { id: 11, title: '庭づくり', author: 'eve', year: 2026, pages: 150, genre: 'hobby', read_at: null, rating: null },
  ]);
});

test('markRead: id 2 の read_at だけが 2026-11-01 になる', () => {
  const db = createBooksDb();
  const r = db.prepare(q.markRead).run();
  assert.equal(r.changes, 1, '変わる行は1つだけ');
  assert.deepEqual(rows(db, 'SELECT id, read_at FROM books WHERE id = 2'), [{ id: 2, read_at: '2026-11-01' }]);
  assert.equal(rows(db, 'SELECT * FROM books WHERE read_at IS NULL').length, 4);
});

test('rateRead: 読み終わっていて rating が無い本（id 5）だけが 3 になる', () => {
  const db = createBooksDb();
  const r = db.prepare(q.rateRead).run();
  assert.equal(r.changes, 1);
  assert.deepEqual(rows(db, 'SELECT id, rating FROM books WHERE rating IS NOT NULL ORDER BY id'), [
    { id: 1, rating: 4 },
    { id: 3, rating: 5 },
    { id: 5, rating: 3 },
    { id: 7, rating: 3 },
    { id: 9, rating: 4 },
  ]);
});

test('removeOld: 1990 年より前の2冊（id 4 と 9）だけが消える', () => {
  const db = createBooksDb();
  const r = db.prepare(q.removeOld).run();
  assert.equal(r.changes, 2);
  assert.deepEqual(rows(db, 'SELECT id FROM books WHERE id IN (4, 9)'), []);
  assert.equal(rows(db, 'SELECT id FROM books').length, 8);
});
