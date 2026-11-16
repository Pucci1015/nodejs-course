// 練習問題8 用: buggy-report.mjs のテスト
// 使い方: node --test buggy-report.test.mjs
//   模範解答を試す: MODULE=../solutions/report.mjs node --test buggy-report.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createBooksDb } from './books.mjs';

const r = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './buggy-report.mjs')).href);

test('unreadTitles: 未読の本の題名を、id の順に', () => {
  assert.deepEqual(r.unreadTitles(createBooksDb()), ['Node.js 入門', '海の地図', 'パンの教科書', 'SQL の練習帳', 'Web の仕組み']);
});

test('newestFirst: 新しい順に limit 冊。同じ年なら id の小さい順', () => {
  const db = createBooksDb();
  db.exec(`INSERT INTO books (id, title, author, year, pages, genre) VALUES (11, '同じ年の本', 'eve', 2023, 100, 'hobby')`);
  assert.deepEqual(r.newestFirst(db, 3), [
    { id: 8, title: 'SQL の練習帳', year: 2024 },
    { id: 2, title: 'Node.js 入門', year: 2023 },
    { id: 11, title: '同じ年の本', year: 2023 },
  ]);
});

test('techOrScience: genre が tech か science で、pages が minPages 以上の本の id', () => {
  const db = createBooksDb();
  assert.deepEqual(r.techOrScience(db, 300), [2, 5, 10]);
  assert.deepEqual(r.techOrScience(db, 240), [1, 2, 5, 7, 8, 10]);
});

test('page: n ページ目（1 から数える）の id。1 ページは size 冊', () => {
  const db = createBooksDb();
  assert.deepEqual(r.page(db, 1, 4), [1, 2, 3, 4]);
  assert.deepEqual(r.page(db, 2, 4), [5, 6, 7, 8]);
  assert.deepEqual(r.page(db, 3, 4), [9, 10]);
});

test('addBook: 渡した year と pages が、その列に入る', () => {
  const db = createBooksDb();
  const id = r.addBook(db, { title: '庭づくり', author: 'eve', year: 2026, pages: 150, genre: 'hobby' });
  assert.deepEqual({ ...db.prepare('SELECT year, pages FROM books WHERE id = ?').get(id) }, { year: 2026, pages: 150 });
});

test('markAuthorRead: その著者の、まだ読んでいない本だけを読んだことにし、変えた数を返す', () => {
  const db = createBooksDb();
  assert.equal(r.markAuthorRead(db, 'bob', '2026-11-11'), 2);
  assert.equal(db.prepare(`SELECT count(*) AS n FROM books WHERE read_at = '2026-11-11'`).get().n, 2);
  assert.equal(db.prepare('SELECT read_at FROM books WHERE id = 1').get().read_at, '2026-01-10', 'ほかの人の本は変えない');
  assert.equal(r.markAuthorRead(db, 'alice', '2026-11-11'), 0, '読み終わった本の日付は変えない');
});
