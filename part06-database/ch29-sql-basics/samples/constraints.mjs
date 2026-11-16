// 第29章 5節で書く、制約で間違ったデータを断る完成形
// 使い方（~/dev/part06/ch29-sql-basics で）: node samples/constraints.mjs
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE users (
    id    INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name  TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 20),
    plan  TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro'))
  )
`);

const insert = db.prepare('INSERT INTO users (email, name, plan) VALUES (?, ?, ?)');

function tryInsert(email, name, plan = 'free') {
  try {
    insert.run(email, name, plan);
    console.log('OK  ', email, name, plan);
  } catch (err) {
    console.log('NG  ', email, name, plan, '→', err.message);
  }
}

tryInsert('alice@example.com', 'alice');
tryInsert('alice@example.com', 'alice2'); // 同じメール
tryInsert('bob@example.com', null); // 名前が無い
tryInsert('carol@example.com', ''); // 名前が空
tryInsert('dave@example.com', 'dave', 'gold'); // 決まっていないプラン

console.table(db.prepare('SELECT * FROM users').all());
db.close();
