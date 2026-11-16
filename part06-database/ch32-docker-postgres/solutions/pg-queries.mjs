// 練習問題1 の模範解答

export async function findByStatus(pool, status) {
  const { rows } = await pool.query('SELECT title FROM tasks WHERE status = $1 ORDER BY id', [status]);
  return rows.map((r) => r.title);
}

export async function searchTitle(pool, word) {
  // ILIKE は、英字の大文字と小文字を区別しない LIKE（PostgreSQL の LIKE は区別する）
  const { rows } = await pool.query('SELECT id, title FROM tasks WHERE title ILIKE $1 ORDER BY id', [`%${word}%`]);
  return rows;
}

export async function countByStatus(pool) {
  // count(*) は bigint なので、pg は文字列で返す。::int で整数にしてから受け取る
  const { rows } = await pool.query('SELECT status, count(*)::int AS n FROM tasks GROUP BY status');
  const counts = { todo: 0, doing: 0, done: 0 };
  for (const r of rows) counts[r.status] = r.n;
  return counts;
}

export async function overdue(pool, { date, limit }) {
  const { rows } = await pool.query(
    `SELECT title FROM tasks
     WHERE status <> 'done' AND due_date < $1
     ORDER BY due_date, id
     LIMIT $2`,
    [date, limit],
  );
  return rows.map((r) => r.title);
}
