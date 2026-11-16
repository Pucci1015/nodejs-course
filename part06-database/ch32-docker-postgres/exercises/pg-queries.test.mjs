// 練習問題1 用: pg-queries.mjs のテスト（PostgreSQL が動いている必要がある。docker compose up -d --wait）
// 使い方: node --test pg-queries.test.mjs
//   模範解答を試す: MODULE=../solutions/pg-queries.mjs node --test pg-queries.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTestPool } from './pg-test.mjs';

const q = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './pg-queries.mjs')).href);

test('findByStatus: status が同じタスクの title を、id の順に', async (t) => {
  const pool = await createTestPool(t);
  assert.deepEqual(await q.findByStatus(pool, 'todo'), ['本を返す', "Let's ストレッチ", '報告書を書く']);
  assert.deepEqual(await q.findByStatus(pool, 'paused'), []);
});

test("searchTitle: word を含むタスク。' があっても、大文字・小文字が違っても見つかる", async (t) => {
  const pool = await createTestPool(t);
  assert.deepEqual(await q.searchTitle(pool, "let's"), [{ id: 4, title: "Let's ストレッチ" }]);
  assert.deepEqual(await q.searchTitle(pool, 'LET'), [{ id: 4, title: "Let's ストレッチ" }]);
  assert.deepEqual(
    (await q.searchTitle(pool, 'を')).map((r) => r.id),
    [1, 2, 5],
  );
  assert.deepEqual(await q.searchTitle(pool, '昼寝'), []);
});

test('countByStatus: 数は number。無い status も 0', async (t) => {
  const pool = await createTestPool(t);
  assert.deepEqual(await q.countByStatus(pool), { todo: 3, doing: 1, done: 1 });
  await pool.query('DELETE FROM tasks WHERE status = $1', ['doing']);
  assert.deepEqual(await q.countByStatus(pool), { todo: 3, doing: 0, done: 1 });
});

test('overdue: 終わっていなくて、date より前が締め切りのものを、締め切りの順に limit 個まで', async (t) => {
  const pool = await createTestPool(t);
  assert.deepEqual(await q.overdue(pool, { date: '2026-11-13', limit: 10 }), ['報告書を書く', '本を返す']);
  assert.deepEqual(await q.overdue(pool, { date: '2026-11-13', limit: 1 }), ['報告書を書く']);
});
