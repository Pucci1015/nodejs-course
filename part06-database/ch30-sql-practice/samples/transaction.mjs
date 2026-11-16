// 第30章 4節で書く、トランザクションで「全部か、何もしないか」にするプログラムの完成形
// 使い方（~/dev/part06/ch30-sql-practice で）: node samples/transaction.mjs
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE points (
    name    TEXT PRIMARY KEY,
    balance INTEGER NOT NULL CHECK (balance >= 0)
  );
  INSERT INTO points (name, balance) VALUES ('alice', 100), ('bob', 0);
`);

const add = db.prepare('UPDATE points SET balance = balance + ? WHERE name = ?');

// from から to へ、amount ポイント移す。途中で失敗したら、全部なかったことにする
function transfer(from, to, amount) {
  db.exec('BEGIN');
  try {
    add.run(amount, to); // 先に増やす
    add.run(-amount, from); // 減らす（足りなければ CHECK で失敗する）
    db.exec('COMMIT');
    console.log(`OK  ${from} → ${to} ${amount}`);
  } catch (err) {
    db.exec('ROLLBACK');
    console.log(`NG  ${from} → ${to} ${amount}: ${err.message}`);
  }
}

transfer('alice', 'bob', 30);
transfer('alice', 'bob', 500); // alice は 70 しか持っていない
console.table(db.prepare('SELECT * FROM points ORDER BY name').all());
db.close();
