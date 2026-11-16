// 練習問題2 用: comments-sql.mjs のテスト（PostgreSQL が動いている必要がある）
// 使い方: node --test comments-sql.test.mjs
//   模範解答を試す: MODULE=../solutions/comments-sql.mjs node --test comments-sql.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTestPool } from './pg-test.mjs';

const { COMMENTS_SQL } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './comments-sql.mjs')).href);

async function setup(t) {
  const pool = await createTestPool(t);
  await pool.query(COMMENTS_SQL);
  return pool;
}
const add = (pool, taskId, body) => pool.query('INSERT INTO comments (task_id, body) VALUES ($1, $2) RETURNING *', [taskId, body]);

test('コメントを足すと、id は 1, 2, … と付き、created_at には今の時刻（Date）が入る', async (t) => {
  const pool = await setup(t);
  const before = Date.now();
  const { rows } = await add(pool, 2, '図書館は 18 時まで');
  assert.equal(rows[0].id, 1);
  assert.equal(rows[0].task_id, 2);
  assert.ok(rows[0].created_at instanceof Date, 'created_at が Date ではありません（timestamptz にする）');
  assert.ok(Math.abs(rows[0].created_at.getTime() - before) < 60_000, 'created_at が今の時刻ではありません');
  assert.equal((await add(pool, 2, '2冊')).rows[0].id, 2);
});

test('無いタスクへのコメントは、外部キーで断る（23503）', async (t) => {
  const pool = await setup(t);
  await assert.rejects(add(pool, 99, 'x'), { code: '23503' });
  await assert.rejects(pool.query('INSERT INTO comments (body) VALUES ($1)', ['x']), { code: '23502' });
});

test('本文は 1〜500 文字（23514）。NULL は断る（23502）', async (t) => {
  const pool = await setup(t);
  await add(pool, 2, 'x'.repeat(500));
  await assert.rejects(add(pool, 2, ''), { code: '23514' });
  await assert.rejects(add(pool, 2, 'x'.repeat(501)), { code: '23514' });
  await assert.rejects(add(pool, 2, null), { code: '23502' });
});

test('タスクを消すと、そのコメントも消える', async (t) => {
  const pool = await setup(t);
  await add(pool, 2, 'a');
  await add(pool, 3, 'b');
  await pool.query('DELETE FROM tasks WHERE id = 2');
  assert.deepEqual((await pool.query('SELECT task_id FROM comments')).rows, [{ task_id: 3 }]);
});

test('task_id と created_at の順のインデックスがある', async (t) => {
  const pool = await setup(t);
  const { rows } = await pool.query(`SELECT indexdef FROM pg_indexes WHERE tablename = 'comments' AND schemaname = current_schema()`);
  assert.ok(
    rows.some((r) => /\(task_id, created_at\)/.test(r.indexdef)),
    `(task_id, created_at) のインデックスがありません: ${rows.map((r) => r.indexdef).join(' / ')}`,
  );
});
