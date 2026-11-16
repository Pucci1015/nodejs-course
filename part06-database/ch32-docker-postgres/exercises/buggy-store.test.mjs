// 練習問題9 用: buggy-store.mjs のテスト（PostgreSQL が動いている必要がある）
// 使い方: node --test buggy-store.test.mjs
//   模範解答を試す: MODULE=../solutions/store.mjs node --test buggy-store.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTestPool } from './pg-test.mjs';

const { createTaskStore } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './buggy-store.mjs')).href);

const statuses = async (pool) => (await pool.query('SELECT status FROM tasks ORDER BY id')).rows.map((r) => r.status);

test('countOpen: 終わっていないタスクの数（number）', async (t) => {
  const pool = await createTestPool(t);
  assert.equal(await createTaskStore(pool).countOpen(), 4);
});

test('search: 英字の大文字・小文字を区別せずに探す', async (t) => {
  const store = createTaskStore(await createTestPool(t));
  assert.deepEqual(await store.search('let'), [4]);
  assert.deepEqual(await store.search('を'), [1, 2, 5]);
});

test('rename: version が合えば変えて { id, title, version }。違えば null', async (t) => {
  const store = createTaskStore(await createTestPool(t));
  assert.deepEqual(await store.rename(2, '図書館に本を返す', 1), { id: 2, title: '図書館に本を返す', version: 2 });
  assert.equal(await store.rename(2, '別の題名', 1), null);
});

test('completeMany: 1つでも失敗したら、全部取り消す', async (t) => {
  const pool = await createTestPool(t);
  const store = createTaskStore(pool);
  await assert.rejects(store.completeMany([2, 3, 1])); // 1 はもう done
  assert.deepEqual(await statuses(pool), ['done', 'todo', 'doing', 'todo', 'todo'], '2 と 3 が done のまま残っています');
  assert.equal(await store.completeMany([2, 3]), 2);
});

test('firstTodo: todo が無くても、接続を返す（接続 1 本のプールで、何回呼んでも待たされない）', async (t) => {
  const pool = await createTestPool(t, { max: 1, connectionTimeoutMillis: 1000 });
  const store = createTaskStore(pool);
  assert.deepEqual(await store.firstTodo(), { id: 2, title: '本を返す' });
  await pool.query(`UPDATE tasks SET status = 'done'`);
  assert.equal(await store.firstTodo(), null);
  assert.equal(await store.firstTodo(), null);
  assert.equal(pool.idleCount, 1, '接続が返されていません');
});
