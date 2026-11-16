// 練習問題7 用: pg-problem.mjs のテスト（PostgreSQL が動いている必要がある）
// 使い方: node --test pg-problem.test.mjs
//   模範解答を試す: MODULE=../solutions/pg-problem.mjs node --test pg-problem.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTestPool } from './pg-test.mjs';

const { toProblem } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './pg-problem.mjs')).href);

async function errorOf(pool, sql, params) {
  try {
    await pool.query(sql, params);
  } catch (err) {
    return err;
  }
  throw new Error('エラーが起きませんでした');
}
const insert = 'INSERT INTO tasks (title, status, due_date) VALUES ($1, $2, $3)';

test('UNIQUE: 制約の名前で文を変える（23505 → 409）', async (t) => {
  const pool = await createTestPool(t);
  assert.deepEqual(toProblem(await errorOf(pool, insert, ['本を返す', 'todo', null])), { status: 409, detail: '同じ題名の、終わっていないタスクがあります' });
  await pool.query('CREATE TABLE codes (code text PRIMARY KEY)');
  await pool.query(`INSERT INTO codes VALUES ('a')`);
  assert.deepEqual(toProblem(await errorOf(pool, 'INSERT INTO codes VALUES ($1)', ['a'])), { status: 409, detail: 'ほかのデータとぶつかりました' });
});

test('CHECK: 制約の名前で文を変える（23514 → 422）', async (t) => {
  const pool = await createTestPool(t);
  assert.deepEqual(toProblem(await errorOf(pool, insert, ['', 'todo', null])), { status: 422, detail: 'title は 1〜100 文字です' });
  assert.deepEqual(toProblem(await errorOf(pool, insert, ['昼寝', 'sleeping', null])), { status: 422, detail: 'status は todo・doing・done のどれかです' });
  await pool.query('ALTER TABLE tasks ADD COLUMN minutes integer CHECK (minutes > 0)');
  assert.deepEqual(toProblem(await errorOf(pool, 'INSERT INTO tasks (title, minutes) VALUES ($1, $2)', ['昼寝', 0])), { status: 422, detail: '送られた値が決まりに合いません' });
});

test('NOT NULL: 列の名前を入れる（23502 → 422）', async (t) => {
  const pool = await createTestPool(t);
  assert.deepEqual(toProblem(await errorOf(pool, insert, [null, 'todo', null])), { status: 422, detail: 'title は必ず送ってください' });
  assert.deepEqual(toProblem(await errorOf(pool, insert, ['昼寝', null, null])), { status: 422, detail: 'status は必ず送ってください' });
});

test('外部キー（23503）と、値の形の間違い（22P02・22007・22008）→ 422', async (t) => {
  const pool = await createTestPool(t);
  await pool.query('CREATE TABLE notes (task_id integer REFERENCES tasks (id))');
  assert.deepEqual(toProblem(await errorOf(pool, 'INSERT INTO notes VALUES ($1)', [99])), { status: 422, detail: 'つながる先のデータがありません' });
  const shape = { status: 422, detail: '値の形が違います（日付は YYYY-MM-DD）' };
  assert.deepEqual(toProblem(await errorOf(pool, insert, ['昼寝', 'todo', '2026-13-45'])), shape);
  assert.deepEqual(toProblem(await errorOf(pool, insert, ['昼寝', 'todo', 'あした'])), shape);
  assert.deepEqual(toProblem(await errorOf(pool, 'SELECT * FROM tasks WHERE id = $1', ['abc'])), shape);
});

test('ほかのデータベースのエラー → 500。PostgreSQL のエラーでなければ null', async (t) => {
  const pool = await createTestPool(t);
  const p = toProblem(await errorOf(pool, 'SELECT * FROM taskz'));
  assert.deepEqual(p, { status: 500, detail: 'サーバの中でエラーが起きました' });
  assert.equal(toProblem(new Error('ふつうのエラー')), null);
  assert.equal(toProblem(Object.assign(new Error('つながらない'), { code: 'ECONNREFUSED' })), null);
  assert.equal(toProblem(Object.assign(new Error('偽物'), { code: '23505' })), null, 'code だけを見ていませんか');
  assert.equal(toProblem(undefined), null);
});
