// 練習問題1 の模範解答

export function findByStatus(db, status) {
  return db.prepare('SELECT title FROM tasks WHERE status = ? ORDER BY id').all(status).map((r) => r.title);
}

export function searchTitle(db, word) {
  // % は SQL の中ではなく、渡す値の側に付ける
  return db
    .prepare('SELECT id, title FROM tasks WHERE title LIKE ? ORDER BY id')
    .all(`%${word}%`)
    .map((r) => ({ ...r }));
}

export function dueBetween(db, from, to) {
  return db
    .prepare('SELECT id FROM tasks WHERE due_date BETWEEN ? AND ? ORDER BY due_date, id')
    .all(from, to)
    .map((r) => r.id);
}

export function overdue(db, { date, limit }) {
  return db
    .prepare(
      `SELECT title FROM tasks
       WHERE status <> 'done' AND due_date < $date
       ORDER BY due_date, id
       LIMIT $limit`,
    )
    .all({ date, limit })
    .map((r) => r.title);
}
