// 第31章 2節で書く、行（データベースの形）とタスク（JavaScript の形）を変換するプログラムの完成形
// 使い方（~/dev/part06/ch31-node-db で）: node samples/row-map.mjs
import { createTaskDb } from './task-db.mjs';

// データベースの列の名前（スネークケース）→ JavaScript の名前（キャメルケース）
function toTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    version: row.version,
  };
}

const db = createTaskDb();
const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(2);
console.log('データベースの行:', row);
console.log('タスク:', toTask(row));
console.log('無い id:', toTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(99)));
console.log('JSON にすると:', JSON.stringify(toTask(row)));
db.close();
