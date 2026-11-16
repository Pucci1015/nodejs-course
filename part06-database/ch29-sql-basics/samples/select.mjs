// 第29章 3節で書く、SELECT で行を選ぶプログラムの完成形
// 使い方（~/dev/part06/ch29-sql-basics で）: node samples/select.mjs
import { createBooksDb } from './books.mjs';

const db = createBooksDb();

console.log('--- tech の本を、新しい順に');
console.table(db.prepare(`
  SELECT title, year FROM books
  WHERE genre = 'tech'
  ORDER BY year DESC
`).all());

console.log('--- まだ読んでいない本（read_at が NULL）を、ページの少ない順に 3 冊');
console.table(db.prepare(`
  SELECT title, pages FROM books
  WHERE read_at IS NULL
  ORDER BY pages
  LIMIT 3
`).all());

console.log('--- 題名に SQL を含む本');
console.table(db.prepare(`SELECT id, title FROM books WHERE title LIKE '%SQL%'`).all());

db.close();
