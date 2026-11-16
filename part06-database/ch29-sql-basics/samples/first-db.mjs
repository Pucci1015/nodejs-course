// 第29章 2節で書く、最初のデータベースの完成形
// 使い方（~/dev/part06/ch29-sql-basics で）: node samples/first-db.mjs
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:'); // メモリの中だけのデータベース（終わると消える）

// テーブルを作る: 列の名前と型を決める
db.exec(`
  CREATE TABLE tasks (
    id    INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    done  INTEGER NOT NULL DEFAULT 0
  )
`);

// 行を足す
db.exec(`INSERT INTO tasks (title) VALUES ('牛乳を買う')`);
db.exec(`INSERT INTO tasks (title, done) VALUES ('本を返す', 1)`);

// 行を読む
const rows = db.prepare('SELECT * FROM tasks').all();
console.log(rows);

db.close();
