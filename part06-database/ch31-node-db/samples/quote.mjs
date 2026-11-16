// 第31章 1節で書く、SQL に値を書き込むと壊れることと、? で渡すと壊れないことを確かめるプログラムの完成形
// 使い方（~/dev/part06/ch31-node-db で）: node samples/quote.mjs
import { createTaskDb } from './task-db.mjs';

const db = createTaskDb();
const word = "Let's"; // 利用者が検索の欄に打った文字だとする

// よくない書き方: 値を SQL の文字列に、そのまま書き込む
try {
  const sql = `SELECT id, title FROM tasks WHERE title LIKE '%${word}%'`;
  console.log('作った SQL:', sql);
  console.log(db.prepare(sql).all());
} catch (err) {
  console.log('エラー:', err.message);
}

// よい書き方: SQL には ? だけを書き、値は別に渡す
const rows = db.prepare('SELECT id, title FROM tasks WHERE title LIKE ?').all(`%${word}%`);
console.log('? で渡した結果:', rows);

// 名前で渡す: SQL に $名前 と書き、オブジェクトで渡す
const task = db.prepare('SELECT id, title FROM tasks WHERE status = $status AND id > $minId').all({ status: 'todo', minId: 2 });
console.log('名前で渡した結果:', task);

db.close();
