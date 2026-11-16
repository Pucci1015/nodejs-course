// 練習問題6 の模範解答

export function listByDueDate(db, { limit, after = null }) {
  // limit より1つ多く取り、余りがあれば「次のページがある」と分かる
  const rows = after
    ? db
        .prepare(
          `SELECT id, title, due_date FROM tasks
           WHERE due_date IS NOT NULL AND (due_date, id) > (?, ?)
           ORDER BY due_date, id
           LIMIT ?`,
        )
        .all(after.dueDate, after.id, limit + 1)
    : db
        .prepare(
          `SELECT id, title, due_date FROM tasks
           WHERE due_date IS NOT NULL
           ORDER BY due_date, id
           LIMIT ?`,
        )
        .all(limit + 1);

  const items = rows.slice(0, limit).map((r) => ({ id: r.id, title: r.title, dueDate: r.due_date }));
  const last = items.at(-1);
  const next = rows.length > limit ? { dueDate: last.dueDate, id: last.id } : null;
  return { items, next };
}
