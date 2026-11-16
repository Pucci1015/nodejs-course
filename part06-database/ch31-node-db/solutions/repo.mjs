// 練習問題9 の模範解答: buggy-repo.mjs の 5 か所を直したもの
// 確かめ方（exercises で）: MODULE=../solutions/repo.mjs node --test buggy-repo.test.mjs

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
      // 直した所1: 値を SQL に書き込むと、' を含む題名で SQL が壊れる。? で渡す
      return toTask(db.prepare('SELECT * FROM tasks WHERE title = ? ORDER BY id').get(title));
    },

    async insert({ title, dueDate = null, now }) {
      const r = db
        .prepare('INSERT INTO tasks (title, due_date, created_at, updated_at) VALUES (?, ?, ?, ?)')
        .run(title, dueDate, now, now);
      // 直した所2: 行のまま返していた（due_date・null prototype）。toTask でタスクの形にする
      return toTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(r.lastInsertRowid));
    },

    async update(id, fields, { expectedVersion } = {}) {
      const keys = Object.keys(fields);
      // 直した所3: dueDate のような名前は列の名前ではない。決めた表（COLUMNS）で列の名前に直し、無い名前は断る
      const sets = keys
        .map((k) => {
          if (!Object.hasOwn(COLUMNS, k)) throw new Error(`知らない項目です: ${k}`);
          return `${COLUMNS[k]} = ?`;
        })
        .join(', ');
      const values = keys.map((k) => fields[k]);
      // 直した所4: expectedVersion を使っていなかった。渡されたら WHERE に足す
      if (expectedVersion === undefined) {
        return toTask(db.prepare(`UPDATE tasks SET ${sets} WHERE id = ? RETURNING *`).get(...values, id));
      }
      return toTask(db.prepare(`UPDATE tasks SET ${sets} WHERE id = ? AND version = ? RETURNING *`).get(...values, id, expectedVersion));
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
        db.exec('ROLLBACK'); // 直した所5: 取り消さないと、先に done にした分が残り、トランザクションも開いたままになる
        throw err;
      }
    },
  };
}
