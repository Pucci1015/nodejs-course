// 第29章 6節で書く、2つのテーブルを外部キーでつなぐ完成形
// 使い方（~/dev/part06/ch29-sql-basics で）: node samples/foreign-key.mjs
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON'); // SQLite では、外部キーの確かめを毎回オンにする
db.exec(`
  CREATE TABLE users (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  );
  CREATE TABLE tasks (
    id      INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title   TEXT NOT NULL
  );
  INSERT INTO users (id, name) VALUES (1, 'alice'), (2, 'bob');
  INSERT INTO tasks (user_id, title) VALUES (1, '牛乳を買う'), (1, '本を返す'), (2, '部屋の掃除');
`);

try {
  db.exec(`INSERT INTO tasks (user_id, title) VALUES (99, 'だれのタスク？')`);
} catch (err) {
  console.log('いない人のタスク →', err.message);
}

db.exec('DELETE FROM users WHERE id = 1'); // alice を消すと、alice のタスクも消える（CASCADE）
console.table(db.prepare('SELECT * FROM tasks').all());
db.close();
