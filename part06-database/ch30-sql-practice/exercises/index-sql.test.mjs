// 練習問題3 用: index-sql.mjs のテスト。EXPLAIN QUERY PLAN で、インデックスを使うかを見る
// 使い方: node --test index-sql.test.mjs
//   模範解答を試す: MODULE=../solutions/index-sql.mjs node --test index-sql.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTasksDb } from './tasks-db.mjs';

const { createIndexes } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './index-sql.mjs')).href);

function plan(sql, ...params) {
  const db = createTasksDb();
  db.exec(createIndexes);
  return db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...params).map((r) => r.detail).join(' / ');
}

test('インデックスを作る SQL が、エラーにならずに動く', () => {
  const db = createTasksDb();
  db.exec(createIndexes);
  const n = db.prepare(`SELECT count(*) AS n FROM sqlite_schema WHERE type = 'index' AND tbl_name = 'tasks' AND sql IS NOT NULL`).get().n;
  assert.ok(n >= 1, 'tasks にインデックスが1つもありません');
});

test('人と status で探す SELECT が、インデックスを使う（SCAN tasks にならない）', () => {
  const p = plan('SELECT id FROM tasks WHERE user_id = ? AND status = ?', 1, 'todo');
  assert.match(p, /SEARCH tasks USING (COVERING )?INDEX/);
  assert.match(p, /user_id=\? AND status=\?/, `両方の列で絞れていません: ${p}`);
});

test('締め切りの範囲で探す SELECT が、インデックスを使う', () => {
  const p = plan('SELECT id FROM tasks WHERE due_date BETWEEN ? AND ?', '2026-11-01', '2026-11-30');
  assert.match(p, /SEARCH tasks USING (COVERING )?INDEX .*due_date/);
});

test('作った後も、データの中身は変わらない', () => {
  const db = createTasksDb();
  db.exec(createIndexes);
  assert.equal(db.prepare('SELECT count(*) AS n FROM tasks').get().n, 8);
});
