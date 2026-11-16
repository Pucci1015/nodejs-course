// 練習問題5 の模範解答
import { withTransaction } from './with-transaction.mjs';

export const TAGS_SQL = `
  CREATE TABLE tags (
    id   integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text    NOT NULL UNIQUE
  );
  CREATE TABLE task_tags (
    task_id integer NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    tag_id  integer NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
  );
`;

export async function setTags(pool, taskId, names) {
  const unique = [...new Set(names)]; // 同じ名前が2回あっても1つに
  await withTransaction(pool, async (client) => {
    await client.query('DELETE FROM task_tags WHERE task_id = $1', [taskId]);
    for (const name of unique) {
      // 無ければ作る。あれば何もしない（第30章 5節の ON CONFLICT）
      await client.query('INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
      // タスクが無ければ、ここで外部キーのエラー（23503）になり、全部取り消される
      await client.query('INSERT INTO task_tags (task_id, tag_id) SELECT $1, id FROM tags WHERE name = $2', [taskId, name]);
    }
  });
  return tagsOf(pool, taskId);
}

export async function tagsOf(pool, taskId) {
  const { rows } = await pool.query(
    `SELECT g.name
     FROM task_tags AS tt
     JOIN tags AS g ON g.id = tt.tag_id
     WHERE tt.task_id = $1
     ORDER BY g.name`,
    [taskId],
  );
  return rows.map((r) => r.name);
}

export async function tasksWithTags(pool) {
  // array_agg で、まとめた行の値を配列にする。タグの無いタスクは、LEFT JOIN で g.name が NULL の1行になるので、
  // FILTER で NULL を除き、何も残らなければ coalesce で空の配列 '{}' にする
  const { rows } = await pool.query(`
    SELECT t.id, t.title,
           coalesce(array_agg(g.name ORDER BY g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS tags
    FROM tasks AS t
    LEFT JOIN task_tags AS tt ON tt.task_id = t.id
    LEFT JOIN tags AS g ON g.id = tt.tag_id
    GROUP BY t.id
    ORDER BY t.id
  `);
  return rows;
}
