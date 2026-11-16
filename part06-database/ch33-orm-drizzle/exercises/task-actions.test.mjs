// 練習問題7 用: task-actions.mjs のテスト（PostgreSQL が動いている必要がある）
// 使い方: node --test task-actions.test.mjs
//   模範解答を試す: MODULE=../solutions/task-actions.mjs node --test task-actions.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTestDb } from './drizzle-test.mjs';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './task-actions.mjs')).href);

test('listPage: limit 個ずつ。最後のページの next は null', async (t) => {
  const { db, queries } = await createTestDb(t);
  queries.length = 0;
  const p1 = await m.listPage(db, { limit: 2 });
  assert.deepEqual(p1, { items: [{ id: 1, title: '牛乳を買う' }, { id: 2, title: '本を返す' }], next: 2 });
  assert.equal(queries.length, 1, 'count(*) を別に数えずに、1回で');
  const p2 = await m.listPage(db, { after: p1.next, limit: 2 });
  assert.deepEqual(p2.items.map((x) => x.id), [3, 4]);
  assert.equal(p2.next, 4);
  const p3 = await m.listPage(db, { after: p2.next, limit: 2 });
  assert.deepEqual(p3, { items: [{ id: 5, title: '報告書を書く' }], next: null });
  assert.deepEqual(await m.listPage(db, { after: 3, limit: 2 }), { items: [{ id: 4, title: "Let's ストレッチ" }, { id: 5, title: '報告書を書く' }], next: null }, 'ちょうど終わるときも null');
});

test('complete: version が合えば完了にして、version を 1 増やす', async (t) => {
  const { db } = await createTestDb(t);
  const before = Date.now();
  const done = await m.complete(db, 3, { expectedVersion: 2 });
  assert.equal(done.id, 3);
  assert.equal(done.status, 'done');
  assert.equal(done.version, 3);
  assert.ok(done.completedAt instanceof Date && done.completedAt.getTime() >= before - 5000, 'completedAt は今の時刻（Date）');
});

test('complete: version が違えば null で、何も変えない。無いタスクも null', async (t) => {
  const { db, pool } = await createTestDb(t);
  assert.equal(await m.complete(db, 3, { expectedVersion: 1 }), null);
  const { rows } = await pool.query('SELECT status, version FROM tasks WHERE id = 3');
  assert.deepEqual(rows[0], { status: 'doing', version: 2 });
  assert.equal(await m.complete(db, 99, { expectedVersion: 1 }), null);
});

test('rename: 変えられたら ok: true', async (t) => {
  const { db } = await createTestDb(t);
  assert.deepEqual(await m.rename(db, 2, '図書館に本を返す'), { ok: true, task: { id: 2, title: '図書館に本を返す' } });
  assert.deepEqual(await m.rename(db, 2, '牛乳を買う'), { ok: true, task: { id: 2, title: '牛乳を買う' } }, '終わったタスクと同じ題名はよい');
});

test('rename: 無い・ぶつかる・決まりに合わない', async (t) => {
  const { db } = await createTestDb(t);
  assert.deepEqual(await m.rename(db, 99, 'x'), { ok: false, reason: 'not-found' });
  assert.deepEqual(await m.rename(db, 2, '部屋の掃除'), { ok: false, reason: 'duplicate' });
  assert.deepEqual(await m.rename(db, 2, ''), { ok: false, reason: 'invalid' });
  assert.deepEqual(await m.rename(db, 2, 'あ'.repeat(101)), { ok: false, reason: 'invalid' });
});

test('rename: 知らないエラーは投げ直す', async (t) => {
  const { db } = await createTestDb(t);
  await assert.rejects(m.rename(db, 2, null), (err) => (err.cause ?? err).code === '23502');
});
