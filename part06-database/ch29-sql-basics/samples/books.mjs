// 第29章のサンプルと練習問題で使う、本のテーブルを作る部品
// createBooksDb() で、メモリの中に books テーブルと 10 冊のデータを作って返す
import { DatabaseSync } from 'node:sqlite';

export const BOOKS_SQL = `
  CREATE TABLE books (
    id      INTEGER PRIMARY KEY,
    title   TEXT    NOT NULL,
    author  TEXT    NOT NULL,
    year    INTEGER NOT NULL,
    pages   INTEGER NOT NULL,
    genre   TEXT    NOT NULL,
    read_at TEXT,
    rating  INTEGER
  );
  INSERT INTO books (id, title, author, year, pages, genre, read_at, rating) VALUES
    (1,  'はじめての SQL',   'alice', 2019, 280, 'tech',    '2026-01-10', 4),
    (2,  'Node.js 入門',     'bob',   2023, 350, 'tech',    NULL,         NULL),
    (3,  'ねこと暮らす',     'carol', 2015, 160, 'hobby',   '2025-12-24', 5),
    (4,  '海の地図',         'dave',  1988, 420, 'novel',   NULL,         NULL),
    (5,  'やさしい統計',     'alice', 2021, 310, 'tech',    '2026-03-02', NULL),
    (6,  'パンの教科書',     'eve',   2020, 190, 'hobby',   NULL,         NULL),
    (7,  '星の図鑑',         'carol', 2008, 240, 'science', '2025-08-15', 3),
    (8,  'SQL の練習帳',     'bob',   2024, 260, 'tech',    NULL,         NULL),
    (9,  '山歩きの本',       'dave',  1979, 200, 'hobby',   '2024-05-05', 4),
    (10, 'Web の仕組み',     'eve',   2022, 330, 'tech',    NULL,         NULL);
`;

export function createBooksDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(BOOKS_SQL);
  return db;
}
