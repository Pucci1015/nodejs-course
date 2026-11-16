// 練習問題5: 本文3節のリポジトリに、メソッドを3つ足してください。
// 要件は README にあります。上の5つ（list・get・insert・update・remove）は、本文と同じものです。
// 確かめ方: node --test task-repo.test.mjs

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

    // ここから下を書く（練習問題5）

    // status が同じタスクを、id の順に
    async findByStatus(status) {
      // ここを書く
    },

    // status ごとの数。無い status も 0 で { todo, doing, done }
    async countByStatus() {
      // ここを書く
    },

    // id の順に limit 個ずつ。after は前のページの最後の id（1ページ目は書かない）。{ items, nextAfter }
    async listPage({ limit, after = 0 }) {
      // ここを書く
    },
  };
}
