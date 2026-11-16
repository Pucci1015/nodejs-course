// 第30章 2節で書く、GROUP BY で数える・足すプログラムの完成形
// 使い方（~/dev/part06/ch30-sql-practice で）: node samples/group.mjs
import { createTasksDb } from './tasks-db.mjs';

const db = createTasksDb();

console.log('--- status ごとの数');
console.table(db.prepare(`
  SELECT status, count(*) AS n
  FROM tasks
  GROUP BY status
  ORDER BY status
`).all());

console.log('--- 人ごとの、終わっていないタスクの数と、見積もりの合計（タスクの無い人も 0 で）');
console.table(db.prepare(`
  SELECT u.name, count(t.id) AS open_tasks, coalesce(sum(t.minutes), 0) AS minutes
  FROM users AS u
  LEFT JOIN tasks AS t ON t.user_id = u.id AND t.status <> 'done'
  GROUP BY u.id
  ORDER BY u.id
`).all());

console.log('--- 終わっていないタスクが 2 つ以上ある人（HAVING）');
console.table(db.prepare(`
  SELECT u.name, count(*) AS n
  FROM users AS u
  JOIN tasks AS t ON t.user_id = u.id
  WHERE t.status <> 'done'
  GROUP BY u.id
  HAVING count(*) >= 2
  ORDER BY u.id
`).all());

db.close();
