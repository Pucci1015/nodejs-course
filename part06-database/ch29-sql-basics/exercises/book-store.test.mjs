// 練習問題5 用: book-store.mjs のテスト
// 使い方: node --test book-store.test.mjs
//   模範解答を試す: MODULE=../solutions/book-store.mjs node --test book-store.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createBooksDb } from './books.mjs';

const store = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './book-store.mjs')).href);

test('addBook: 足した本の id（11）を数で返し、本が増える', () => {
  const db = createBooksDb();
  const id = store.addBook(db, { title: '庭づくり', author: 'eve', year: 2026, pages: 150, genre: 'hobby' });
  assert.equal(id, 11);
  assert.equal(typeof id, 'number');
  assert.equal(db.prepare('SELECT title FROM books WHERE id = 11').get().title, '庭づくり');
});

test("addBook: 題名に ' が入っていても、そのまま入る", () => {
  const db = createBooksDb();
  const id = store.addBook(db, { title: "eve's garden", author: 'eve', year: 2026, pages: 90, genre: 'hobby' });
  assert.equal(db.prepare('SELECT title FROM books WHERE id = ?').get(id).title, "eve's garden");
});

test('findByAuthor: その著者の本を、year の古い順に { id, title, year } で返す', () => {
  const db = createBooksDb();
  assert.deepEqual(store.findByAuthor(db, 'carol'), [
    { id: 7, title: '星の図鑑', year: 2008 },
    { id: 3, title: 'ねこと暮らす', year: 2015 },
  ]);
  assert.deepEqual(store.findByAuthor(db, 'nobody'), []);
});

test('markRead: 変えたら true、無い id なら false', () => {
  const db = createBooksDb();
  assert.equal(store.markRead(db, 2, '2026-11-11'), true);
  assert.equal(db.prepare('SELECT read_at FROM books WHERE id = 2').get().read_at, '2026-11-11');
  assert.equal(store.markRead(db, 99, '2026-11-11'), false);
});

test('countUnread: 未読の冊数を数で返す。読むと減る', () => {
  const db = createBooksDb();
  assert.equal(store.countUnread(db), 5);
  store.markRead(db, 2, '2026-11-11');
  assert.equal(store.countUnread(db), 4);
});
