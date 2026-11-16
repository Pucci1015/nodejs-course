// 練習問題5 の模範解答（本文3節のリポジトリに、3つのメソッドを足したもの）

// JavaScript の名前 → 列の名前。ここに無い名前は、SQL に入れない（1節: 列の名前は ? で渡せないので、決めた中から選ぶ）
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

export function createSqliteTaskRepo(db) {
  // 毎回同じ SQL は、最初に1回だけ prepare しておく
  const listStmt = db.prepare('SELECT * FROM tasks ORDER BY id');
  const getStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');

  return {
    async list() {
      return listStmt.all().map(toTask);
    },

    async get(id) {
      return toTask(getStmt.get(id));
    },

    async insert(fields) {
      const keys = Object.keys(fields);
      const cols = keys.map(column).join(', ');
      const marks = keys.map(() => '?').join(', ');
      const row = db
        .prepare(`INSERT INTO tasks (${cols}) VALUES (${marks}) RETURNING *`)
        .get(...keys.map((k) => fields[k]));
      return toTask(row);
    },

    // expectedVersion を渡されたら、今の version が同じときだけ変える。無い・違うときは null
    async update(id, fields, { expectedVersion } = {}) {
      const keys = Object.keys(fields).filter((k) => k !== 'id'); // id は変えさせない
      if (keys.length === 0) return this.get(id);
      const sets = keys.map((k) => `${column(k)} = ?`).join(', ');
      const values = keys.map((k) => fields[k]);
      let sql = `UPDATE tasks SET ${sets} WHERE id = ?`;
      values.push(id);
      if (expectedVersion !== undefined) {
        sql += ' AND version = ?';
        values.push(expectedVersion);
      }
      return toTask(db.prepare(`${sql} RETURNING *`).get(...values));
    },

    async remove(id, { expectedVersion } = {}) {
      const r =
        expectedVersion === undefined
          ? db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
          : db.prepare('DELETE FROM tasks WHERE id = ? AND version = ?').run(id, expectedVersion);
      return r.changes > 0;
    },

    // ここから下が、練習問題5 で足したもの

    async findByStatus(status) {
      return db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY id').all(status).map(toTask);
    },

    async countByStatus() {
      const counts = { todo: 0, doing: 0, done: 0 }; // 1つも無い status も 0 で返すために、先に 0 を入れておく
      for (const row of db.prepare('SELECT status, count(*) AS n FROM tasks GROUP BY status').all()) {
        counts[row.status] = row.n;
      }
      return counts;
    },

    async listPage({ limit, after = 0 }) {
      const rows = db.prepare('SELECT * FROM tasks WHERE id > ? ORDER BY id LIMIT ?').all(after, limit + 1);
      const items = rows.slice(0, limit).map(toTask);
      return { items, nextAfter: rows.length > limit ? items.at(-1).id : null };
    },
  };
}
