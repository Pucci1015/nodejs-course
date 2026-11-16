// 練習問題9: タスクのリポジトリに、バグが 5 か所あります。README の仕様に合わせて直してください。
// 確かめ方: node --test buggy-repo.test.mjs

const COLUMNS = {
  title: 'title',
  status: 'status',
  dueDate: 'due_date',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  completedAt: 'completed_at',
  version: 'version',
};

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

export function createBuggyRepo(db) {
  return {
    async findByTitle(title) {
      return toTask(db.prepare(`SELECT * FROM tasks WHERE title = '${title}' ORDER BY id`).get());
    },

    async insert({ title, dueDate = null, now }) {
      const r = db
        .prepare('INSERT INTO tasks (title, due_date, created_at, updated_at) VALUES (?, ?, ?, ?)')
        .run(title, dueDate, now, now);
      return db.prepare('SELECT * FROM tasks WHERE id = ?').get(r.lastInsertRowid);
    },

    async update(id, fields, { expectedVersion } = {}) {
      const keys = Object.keys(fields);
      const sets = keys.map((k) => `${k} = ?`).join(', ');
      const values = keys.map((k) => fields[k]);
      return toTask(db.prepare(`UPDATE tasks SET ${sets} WHERE id = ? RETURNING *`).get(...values, id));
    },

    async completeAll(ids, now) {
      const complete = db.prepare(`UPDATE tasks SET status = 'done', completed_at = ?, version = version + 1 WHERE id = ? AND status <> 'done'`);
      db.exec('BEGIN');
      try {
        for (const id of ids) {
          if (complete.run(now, id).changes === 0) throw new Error(`タスク ${id} は無いか、もう終わっています`);
        }
        db.exec('COMMIT');
        return ids.length;
      } catch (err) {
        throw err;
      }
    },
  };
}
