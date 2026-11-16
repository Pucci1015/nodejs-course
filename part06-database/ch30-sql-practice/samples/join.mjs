// 第30章 1節で書く、JOIN でテーブルをつないで読むプログラムの完成形
// 使い方（~/dev/part06/ch30-sql-practice で）: node samples/join.mjs
import { createTasksDb } from './tasks-db.mjs';

const db = createTasksDb();

console.log('--- タスクと、その持ち主の名前（INNER JOIN）');
console.table(db.prepare(`
  SELECT t.id, t.title, u.name
  FROM tasks AS t
  JOIN users AS u ON u.id = t.user_id
  WHERE t.status <> 'done'
  ORDER BY t.id
`).all());

console.log('--- 人と、その人のタスク（LEFT JOIN。タスクの無い人も出る）');
console.table(db.prepare(`
  SELECT u.name, t.title
  FROM users AS u
  LEFT JOIN tasks AS t ON t.user_id = u.id AND t.status = 'doing'
  ORDER BY u.id
`).all());

console.log('--- 「家」のタグが付いたタスク（多対多を2回の JOIN で）');
console.table(db.prepare(`
  SELECT t.id, t.title
  FROM tasks AS t
  JOIN task_tags AS tt ON tt.task_id = t.id
  JOIN tags AS g ON g.id = tt.tag_id
  WHERE g.name = '家'
  ORDER BY t.id
`).all());

db.close();
