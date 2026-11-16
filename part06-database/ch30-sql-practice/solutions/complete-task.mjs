// 練習問題5 の模範解答

export const EVENTS_SQL = `
  CREATE TABLE task_events (
    id      INTEGER PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    kind    TEXT    NOT NULL,
    at      TEXT    NOT NULL
  )
`;

export function completeTask(db, id, at) {
  db.exec('BEGIN');
  try {
    const r = db
      .prepare(`UPDATE tasks SET status = 'done', version = version + 1 WHERE id = ? AND status <> 'done'`)
      .run(id);
    if (r.changes === 0) throw new Error(`タスク ${id} は無いか、もう終わっています`);
    db.prepare(`INSERT INTO task_events (task_id, kind, at) VALUES (?, 'completed', ?)`).run(id, at);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
