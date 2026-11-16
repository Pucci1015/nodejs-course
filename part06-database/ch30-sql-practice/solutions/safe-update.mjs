// 練習問題7 の模範解答

export const KEYS_SQL = `
  CREATE TABLE idempotency_keys (
    key     TEXT PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE
  )
`;

export function renameTask(db, id, title, expectedVersion) {
  const task = db
    .prepare(
      `UPDATE tasks SET title = ?, version = version + 1
       WHERE id = ? AND version = ?
       RETURNING id, title, version`,
    )
    .get(title, id, expectedVersion);
  if (task) return { ok: true, task: { ...task } };
  // 変わらなかった理由を、後から調べる（無いのか、version が違うのか）
  const exists = db.prepare('SELECT 1 FROM tasks WHERE id = ?').get(id);
  return { ok: false, reason: exists ? 'conflict' : 'not_found' };
}

export function createTaskOnce(db, key, { userId, title, minutes }) {
  db.exec('BEGIN');
  try {
    const seen = db.prepare('SELECT task_id FROM idempotency_keys WHERE key = ?').get(key);
    if (seen) {
      db.exec('COMMIT');
      return { id: seen.task_id, created: false };
    }
    const { id } = db
      .prepare('INSERT INTO tasks (user_id, title, minutes) VALUES (?, ?, ?) RETURNING id')
      .get(userId, title, minutes);
    db.prepare('INSERT INTO idempotency_keys (key, task_id) VALUES (?, ?)').run(key, id);
    db.exec('COMMIT');
    return { id, created: true };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
