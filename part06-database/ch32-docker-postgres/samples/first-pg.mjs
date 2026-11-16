// 第32章 4.1節で書く、Node.js から PostgreSQL に SQL を送るプログラムの完成形
// 使い方（~/dev/part06/ch32-docker-postgres で）: node samples/first-pg.mjs
//   先に、3節の schema.sql で tasks を作っておく
import { createPool } from './db.mjs';

const pool = createPool();

const version = await pool.query('SELECT version()');
console.log(version.rows[0].version.split(' on ')[0]);

// 値は $1, $2, … で渡す（SQLite の ? と同じ役目。番号で、どの値かを指す）
const todo = await pool.query('SELECT id, title, due_date FROM tasks WHERE status = $1 ORDER BY id', ['todo']);
console.log(`todo は ${todo.rowCount} 件:`);
console.table(todo.rows);

const inserted = await pool.query(
  'INSERT INTO tasks (title, due_date) VALUES ($1, $2) RETURNING id, title, created_at',
  ['花に水をやる', '2026-12-01'],
);
console.log('足した行:', inserted.rows[0]);

const removed = await pool.query('DELETE FROM tasks WHERE id = $1', [inserted.rows[0].id]);
console.log('消した行の数:', removed.rowCount);

await pool.end(); // つなぎっぱなしの接続を閉じる。これが無いと、プログラムが終わらない
