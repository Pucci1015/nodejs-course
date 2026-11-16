// 練習問題9 の模範解答: buggy-store.mjs の 5 か所を直したもの
// 確かめ方（exercises で）: MODULE=../solutions/store.mjs node --test buggy-store.test.mjs
import { withTransaction } from './with-transaction.mjs';

export function createTaskStore(pool) {
  return {
    async countOpen() {
      // 直した所1: count(*) は bigint なので、pg は文字列 '4' で返す。::int で整数にする
      const { rows } = await pool.query(`SELECT count(*)::int AS n FROM tasks WHERE status <> 'done'`);
      return rows[0].n;
    },

    async search(word) {
      // 直した所2: PostgreSQL の LIKE は、英字の大文字と小文字を区別する。区別しないのは ILIKE
      const { rows } = await pool.query('SELECT id FROM tasks WHERE title ILIKE $1 ORDER BY id', [`%${word}%`]);
      return rows.map((r) => r.id);
    },

    async rename(id, title, expectedVersion) {
      const { rows } = await pool.query(
        // 直した所3: $ の番号が、値の配列の位置と合っていなかった（id は 2 番目、expectedVersion は 3 番目）
        'UPDATE tasks SET title = $1, version = version + 1 WHERE id = $2 AND version = $3 RETURNING id, title, version',
        [title, id, expectedVersion],
      );
      return rows[0] ?? null;
    },

    async completeMany(ids) {
      return withTransaction(pool, async (client) => {
        for (const id of ids) {
          // 直した所4: pool.query は別の接続で動くので、トランザクションの外になる。渡された client を使う
          const r = await client.query(`UPDATE tasks SET status = 'done', completed_at = now() WHERE id = $1 AND status <> 'done'`, [id]);
          if (r.rowCount === 0) throw new Error(`タスク ${id} は無いか、もう終わっています`);
        }
        return ids.length;
      });
    },

    async firstTodo() {
      // 直した所5: 早く return すると release されず、接続がプールに戻らなかった。finally で必ず返す
      // （1つの SQL だけなら、pool.query を使えば、借りて返すことを pg がしてくれる）
      const client = await pool.connect();
      try {
        const { rows } = await client.query(`SELECT id, title FROM tasks WHERE status = 'todo' ORDER BY id LIMIT 1`);
        return rows[0] ?? null;
      } finally {
        client.release();
      }
    },
  };
}
