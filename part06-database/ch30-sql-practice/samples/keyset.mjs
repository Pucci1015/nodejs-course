// 第30章 6節で書く、カーソル（最後に見た行）でページを分けるプログラムの完成形
// 使い方（~/dev/part06/ch30-sql-practice で）: node samples/keyset.mjs
import { createTasksDb } from './tasks-db.mjs';

const db = createTasksDb();

// 締め切りの早い順、同じ締め切りなら id の順。「最後に見た行より後」を WHERE で選ぶ
const firstPage = db.prepare(`
  SELECT id, due_date, title FROM tasks
  WHERE due_date IS NOT NULL
  ORDER BY due_date, id
  LIMIT ?
`);
const nextPage = db.prepare(`
  SELECT id, due_date, title FROM tasks
  WHERE due_date IS NOT NULL
    AND (due_date, id) > (?, ?)
  ORDER BY due_date, id
  LIMIT ?
`);

let rows = firstPage.all(3);
let page = 1;
while (rows.length > 0) {
  console.log(`--- ${page} ページ目`);
  console.table(rows);
  const last = rows.at(-1); // 最後に見た行
  rows = nextPage.all(last.due_date, last.id, 3);
  page += 1;
}

db.close();
