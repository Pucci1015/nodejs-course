// 練習問題3 用: with-client.mjs のテスト（PostgreSQL が動いている必要がある）
// 使い方: node --test with-client.test.mjs
//   模範解答を試す: MODULE=../solutions/with-client.mjs node --test with-client.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTestPool } from './pg-test.mjs';

const { withClient, withTransaction } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './with-client.mjs')).href);

const pid = async (c) => (await c.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
const count = async (pool) => (await pool.query('SELECT count(*)::int AS n FROM tasks')).rows[0].n;

test('withClient: fn の戻り値を返す。fn の中は、ずっと同じ接続', async (t) => {
  const pool = await createTestPool(t);
  const [a, b] = await withClient(pool, async (client) => [await pid(client), await pid(client)]);
  assert.equal(typeof a, 'number');
  assert.equal(a, b);
});

test('withClient: fn が失敗しても接続を返す（接続 1 本のプールで、次の withClient が待たされない）', async (t) => {
  const pool = await createTestPool(t, { max: 1, connectionTimeoutMillis: 1000 });
  await assert.rejects(withClient(pool, async () => { throw new Error('わざと'); }), /わざと/);
  assert.equal(await withClient(pool, async (client) => (await client.query('SELECT 1 AS one')).rows[0].one), 1);
  assert.equal(pool.idleCount, 1, '接続が返されていません');
});

test('withClient: fn が終わるまで、接続を返さない', async (t) => {
  const pool = await createTestPool(t, { max: 1 });
  await withClient(pool, async (client) => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(pool.idleCount, 0, 'fn の途中で、接続が返されています（await を忘れていませんか）');
    await client.query('SELECT 1');
  });
});

test('withTransaction: 成功したら COMMIT、戻り値を返す', async (t) => {
  const pool = await createTestPool(t);
  const id = await withTransaction(pool, async (client) => {
    const { rows } = await client.query('INSERT INTO tasks (title) VALUES ($1) RETURNING id', ['窓を拭く']);
    await client.query('INSERT INTO tasks (title) VALUES ($1)', ['靴を洗う']);
    return rows[0].id;
  });
  assert.equal(id, 6);
  assert.equal(await count(pool), 7);
});

test('withTransaction: 失敗したら ROLLBACK して投げ直し、接続も返す', async (t) => {
  const pool = await createTestPool(t, { max: 1, connectionTimeoutMillis: 1000 });
  await assert.rejects(
    withTransaction(pool, async (client) => {
      await client.query('INSERT INTO tasks (title) VALUES ($1)', ['窓を拭く']);
      await client.query('INSERT INTO tasks (title) VALUES ($1)', ['本を返す']); // 題名が重なる
    }),
    { code: '23505' },
  );
  assert.equal(await count(pool), 5);
  assert.equal(pool.idleCount, 1, '接続が返されていません');
});
