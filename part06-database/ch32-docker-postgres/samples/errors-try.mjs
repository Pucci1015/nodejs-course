// 第32章 7節で書く、PostgreSQL のエラーの中身を見るプログラムの完成形
// 使い方（~/dev/part06/ch32-docker-postgres で）: node samples/errors-try.mjs
//   先に、3節の schema.sql で tasks を作っておく
import { createPool } from './db.mjs';
import { statusForPgError } from './pg-errors.mjs';

const pool = createPool();
const insert = 'INSERT INTO tasks (title, status, due_date) VALUES ($1, $2, $3)';
const tries = [
  ['本を返す', 'todo', null], // 終わっていない「本を返す」がもうある
  ['昼寝', 'sleeping', null], // 決まっていない status
  [null, 'todo', null], // 題名が無い
  ['昼寝', 'todo', '2026-13-45'], // ありえない日付
];
for (const params of tries) {
  try {
    await pool.query(insert, params);
    console.log('OK');
  } catch (err) {
    console.log(`${statusForPgError(err)}  code=${err.code}  constraint=${err.constraint}  column=${err.column}`);
    console.log(`     message: ${err.message}`);
  }
}
await pool.end();
