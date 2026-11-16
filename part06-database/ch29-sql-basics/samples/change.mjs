// 第29章 4節で書く、INSERT・UPDATE・DELETE と ? の完成形
// 使い方（~/dev/part06/ch29-sql-basics で）: node samples/change.mjs
import { createBooksDb } from './books.mjs';

const db = createBooksDb();

// ? の所に、run の引数が順に入る
const insert = db.prepare('INSERT INTO books (title, author, year, pages, genre) VALUES (?, ?, ?, ?, ?)');
const r1 = insert.run('新しい本', 'eve', 2026, 120, 'hobby');
console.log('INSERT', r1);

const r2 = db.prepare('UPDATE books SET read_at = ? WHERE id = ?').run('2026-11-11', 2);
console.log('UPDATE', r2);

const r3 = db.prepare('DELETE FROM books WHERE year < ?').run(1990);
console.log('DELETE', r3);

const { n } = db.prepare('SELECT count(*) AS n FROM books').get();
console.log(`残りは ${n} 冊`);

db.close();
