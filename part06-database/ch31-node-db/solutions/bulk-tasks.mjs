// 練習問題6 の模範解答
import { withTransaction } from './with-transaction.mjs';

export function importTasks(db, titles, now) {
  const insert = db.prepare('INSERT INTO tasks (title, created_at, updated_at) VALUES (?, ?, ?) RETURNING id');
  return withTransaction(db, () =>
    titles.map((title, i) => {
      try {
        return insert.get(title, now, now).id;
      } catch (err) {
        // 何件目で失敗したかを足して投げ直す（元のエラーは cause に残す）
        throw new Error(`${i + 1} 件目（${title}）が作れません: ${err.message}`, { cause: err });
      }
    }),
  );
}

export function completeMany(db, ids, now) {
  const complete = db.prepare(`
    UPDATE tasks SET status = 'done', completed_at = ?, updated_at = ?, version = version + 1
    WHERE id = ? AND status <> 'done'
  `);
  return withTransaction(db, () => {
    for (const id of ids) {
      if (complete.run(now, now, id).changes === 0) throw new Error(`タスク ${id} は無いか、もう終わっています`);
    }
    return ids.length;
  });
}
