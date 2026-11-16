// 第31章 6節で書く、制約のエラーを見分けるプログラムの完成形
// 使い方（~/dev/part06/ch31-node-db で）: node samples/db-errors.mjs
import { createTaskDb } from './task-db.mjs';
import { statusForDbError } from './sqlite-errors.mjs';

const db = createTaskDb();
const insert = db.prepare('INSERT INTO tasks (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)');
const now = '2026-11-11T00:00:00.000Z';

const tries = [
  ['本を返す', 'todo'], // 終わっていない「本を返す」がもうある
  ['牛乳を買う', 'todo'], // 「牛乳を買う」は done なので、ぶつからない
  ['x'.repeat(101), 'todo'], // 101 文字
  ['昼寝', 'sleeping'], // 決まっていない status
  [null, 'todo'], // 題名が無い
];
for (const [title, status] of tries) {
  try {
    insert.run(title, status, now, now);
    console.log(`OK   ${String(title).slice(0, 10)}`);
  } catch (err) {
    console.log(`${statusForDbError(err)}  errcode=${err.errcode}  ${err.message}`);
  }
}

try {
  db.prepare('SELECT * FROM taskz').all(); // 表の名前の書き間違い
} catch (err) {
  console.log(`${statusForDbError(err)} errcode=${err.errcode}  ${err.message}（制約ではないので 500 にする）`);
}
db.close();
