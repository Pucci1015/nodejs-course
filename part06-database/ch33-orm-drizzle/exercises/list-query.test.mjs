// 練習問題3 用: list-query.mjs のテスト（PostgreSQL が動いている必要がある）
// 使い方: node --test list-query.test.mjs
//   模範解答を試す: MODULE=../solutions/list-query.mjs node --test list-query.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTestDb } from './drizzle-test.mjs';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './list-query.mjs')).href);
const ids = (rows) => rows.map((r) => r.id);

test('何も渡さなければ、全部を id の順に。WHERE は付かない', async (t) => {
  const { db } = await createTestDb(t);
  const query = m.listQuery(db);
  assert.ok(query && typeof query.toSQL === 'function', 'await する前のクエリを返してください（async にしない）');
  assert.doesNotMatch(query.toSQL().sql, /where/i);
  const rows = await query;
  assert.deepEqual(ids(rows), [1, 2, 3, 4, 5]);
  assert.deepEqual(rows[1], { id: 2, title: '本を返す', status: 'todo', dueDate: '2026-11-12' });
});

test('渡した条件だけが付く', async (t) => {
  const { db } = await createTestDb(t);
  assert.deepEqual(ids(await m.listQuery(db, { status: 'todo' })), [2, 4, 5]);
  assert.deepEqual(ids(await m.listQuery(db, { q: 'を' })), [1, 2, 5]);
  assert.deepEqual(ids(await m.listQuery(db, { dueBefore: '2026-11-13' })), [1, 2, 5]);
  assert.deepEqual(ids(await m.listQuery(db, { status: 'todo', q: 'を', dueBefore: '2026-11-11' })), [5]);
});

test('検索の言葉は SQL に入らず、値（params）として送られる', async (t) => {
  const { db } = await createTestDb(t);
  const { sql, params } = m.listQuery(db, { q: "Let's" }).toSQL();
  assert.doesNotMatch(sql, /Let's/);
  assert.ok(params.includes("%Let's%"), `params: ${JSON.stringify(params)}`);
  assert.deepEqual(ids(await m.listQuery(db, { q: "let's" })), [4]);
});

test('sort と order。同じ値なら id の順', async (t) => {
  const { db } = await createTestDb(t);
  assert.deepEqual(ids(await m.listQuery(db, { sort: 'id', order: 'desc' })), [5, 4, 3, 2, 1]);
  assert.deepEqual(ids(await m.listQuery(db, { sort: 'dueDate' })), [1, 5, 2, 3, 4], 'due_date が NULL のものは最後');
  assert.deepEqual(ids(await m.listQuery(db, { sort: 'createdAt', order: 'desc', limit: 2 })), [5, 4]);
});

test('決まりに合わない sort・order・limit は RangeError（データベースに送る前に）', async (t) => {
  const { db, queries } = await createTestDb(t);
  for (const bad of [{ sort: 'version' }, { sort: 'toString' }, { sort: 'id; DROP' }, { order: 'up' }, { limit: 0 }, { limit: 101 }, { limit: 2.5 }, { limit: '10' }]) {
    assert.throws(() => m.listQuery(db, bad), RangeError, JSON.stringify(bad));
  }
  assert.equal(queries.length, 0);
});
