// 練習問題7 の模範解答
import { DatabaseSync } from 'node:sqlite';

const dbFile = process.env.TODO_DB ?? 'todo.db';
const [command, arg] = process.argv.slice(2);
const USAGE = '使い方: node todo-db.mjs add 題名 | list | done 番号 | rm 番号';

function main() {
  const db = new DatabaseSync(dbFile);
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id    INTEGER PRIMARY KEY,
        title TEXT    NOT NULL,
        done  INTEGER NOT NULL DEFAULT 0
      )
    `);

    if (command === 'add') {
      if (!arg) return usage();
      const r = db.prepare('INSERT INTO tasks (title) VALUES (?)').run(arg);
      console.log(`追加しました: ${r.lastInsertRowid} ${arg}`);
      return 0;
    }
    if (command === 'list') {
      const rows = db.prepare('SELECT id, title, done FROM tasks ORDER BY id').all();
      if (rows.length === 0) console.log('タスクはありません');
      for (const t of rows) console.log(`${t.done ? '[x]' : '[ ]'} ${t.id} ${t.title}`);
      return 0;
    }
    if (command === 'done' || command === 'rm') {
      if (!arg) return usage();
      const sql = command === 'done' ? 'UPDATE tasks SET done = 1 WHERE id = ?' : 'DELETE FROM tasks WHERE id = ?';
      const r = db.prepare(sql).run(arg);
      if (r.changes === 0) {
        console.error(`タスク ${arg} はありません`);
        return 1;
      }
      console.log(`${command === 'done' ? '完了にしました' : '消しました'}: ${arg}`);
      return 0;
    }
    return usage();
  } finally {
    db.close();
  }
}

function usage() {
  console.error(USAGE);
  return 2;
}

process.exitCode = main();
