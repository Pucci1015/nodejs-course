// 6.1節: SQL に値を入れるのはプレースホルダで（第6部 第31章のおさらい）
// 動かし方: node samples/sql.ts
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE tasks (id INTEGER PRIMARY KEY, title TEXT NOT NULL)');

const title = "Let's ストレッチ"; // 利用者が入力した題名のつもり

// ✗ 文字列をつなげて SQL を作る: ' が SQL の文字列の終わりとして読まれ、SQL が壊れる
try {
  db.exec(`INSERT INTO tasks (title) VALUES ('${title}')`);
} catch (err) {
  console.log('つなげた SQL:', err instanceof Error ? err.message : err);
}

// ✓ プレースホルダ: SQL と値を別々に渡す。値は SQL として読まれない
db.prepare('INSERT INTO tasks (title) VALUES (?)').run(title);
console.log('プレースホルダ:', db.prepare('SELECT id, title FROM tasks').all());
