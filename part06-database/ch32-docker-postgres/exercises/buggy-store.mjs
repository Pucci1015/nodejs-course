// 練習問題9: PostgreSQL を使う関数に、バグが 5 か所あります。README の仕様に合わせて直してください。
// 確かめ方: node --test buggy-store.test.mjs
import { withTransaction } from './with-transaction.mjs';

export function createTaskStore(pool) {
  return {
    async countOpen() {
      const { rows } = await pool.query(`SELECT count(*) AS n FROM tasks WHERE status <> 'done'`);
      return rows[0].n;
    },

    async search(word) {
      const { rows } = await pool.query('SELECT id FROM tasks WHERE title LIKE $1 ORDER BY id', [`%${word}%`]);
      return rows.map((r) => r.id);
    },

    async rename(id, title, expectedVersion) {
      const { rows } = await pool.query(
        'UPDATE tasks SET title = $1, version = version + 1 WHERE id = $1 AND version = $2 RETURNING id, title, version',
        [title, id, expectedVersion],
      );
      return rows[0] ?? null;
    },

    async completeMany(ids) {
      return withTransaction(pool, async (client) => {
        for (const id of ids) {
          const r = await pool.query(`UPDATE tasks SET status = 'done', completed_at = now() WHERE id = $1 AND status <> 'done'`, [id]);
          if (r.rowCount === 0) throw new Error(`タスク ${id} は無いか、もう終わっています`);
        }
        return ids.length;
      });
    },

    async firstTodo() {
      const client = await pool.connect();
      const { rows } = await client.query(`SELECT id, title FROM tasks WHERE status = 'todo' ORDER BY id LIMIT 1`);
      if (rows.length === 0) return null;
      client.release();
      return rows[0];
    },
  };
}
