// 第32章 8.2節で書く、タスクのリポジトリの PostgreSQL 版の完成形
// 第31章の SQLite 版と同じ形（list・get・insert・update・remove）。違いは $1 の番号、await、日時の型だけ
// 使い方: import { createPgTaskRepo } from './pg-task-repo.mjs';  const repo = createPgTaskRepo(pool);

const COLUMNS = {
  title: 'title',
  status: 'status',
  dueDate: 'due_date',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  completedAt: 'completed_at',
  version: 'version',
};

function column(key) {
  if (!Object.hasOwn(COLUMNS, key)) throw new Error(`知らない項目です: ${key}`);
  return COLUMNS[key];
}

// timestamptz は Date で来るので、第5部と同じ ISO 8601 の文字列にする。date は db.mjs の設定で文字列のまま来る
const iso = (d) => (d === null ? null : d.toISOString());

function toTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    dueDate: row.due_date,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    completedAt: iso(row.completed_at),
    version: row.version,
  };
}

// db には pool か、withTransaction が渡す client のどちらを渡してもよい（どちらも query を持っている）
export function createPgTaskRepo(db) {
  return {
    async list() {
      return (await db.query('SELECT * FROM tasks ORDER BY id')).rows.map(toTask);
    },

    async get(id) {
      return toTask((await db.query('SELECT * FROM tasks WHERE id = $1', [id])).rows[0]);
    },

    async insert(fields) {
      const keys = Object.keys(fields);
      const cols = keys.map(column).join(', ');
      const marks = keys.map((_, i) => `$${i + 1}`).join(', '); // 項目が3つなら '$1, $2, $3'
      const { rows } = await db.query(
        `INSERT INTO tasks (${cols}) VALUES (${marks}) RETURNING *`,
        keys.map((k) => fields[k]),
      );
      return toTask(rows[0]);
    },

    async update(id, fields, { expectedVersion } = {}) {
      const keys = Object.keys(fields).filter((k) => k !== 'id');
      if (keys.length === 0) return this.get(id);
      const values = keys.map((k) => fields[k]);
      const sets = keys.map((k, i) => `${column(k)} = $${i + 1}`).join(', ');
      values.push(id);
      let sql = `UPDATE tasks SET ${sets} WHERE id = $${values.length}`;
      if (expectedVersion !== undefined) {
        values.push(expectedVersion);
        sql += ` AND version = $${values.length}`;
      }
      const { rows } = await db.query(`${sql} RETURNING *`, values);
      return toTask(rows[0]);
    },

    async remove(id, { expectedVersion } = {}) {
      const r =
        expectedVersion === undefined
          ? await db.query('DELETE FROM tasks WHERE id = $1', [id])
          : await db.query('DELETE FROM tasks WHERE id = $1 AND version = $2', [id, expectedVersion]);
      return r.rowCount > 0;
    },
  };
}
