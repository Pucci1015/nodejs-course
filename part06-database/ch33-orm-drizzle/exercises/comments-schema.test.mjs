// 練習問題1 用: comments-schema.mjs のテスト（PostgreSQL が動いている必要がある）
// 使い方: node --test comments-schema.test.mjs
//   模範解答を試す: MODULE=../solutions/comments-schema.mjs node --test comments-schema.test.mjs
// テストは、書いたスキーマから drizzle-kit に CREATE TABLE の SQL を作らせ、テスト用のスキーマで動かしてから確かめる
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { eq } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import { createTestDb } from './drizzle-test.mjs';
import { tasks } from './schema.mjs';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './comments-schema.mjs')).href);

async function setup(t) {
  assert.ok(m.comments, 'comments を export してください');
  const ctx = await createTestDb(t);
  const statements = await generateMigration(generateDrizzleJson({ tasks }), generateDrizzleJson({ tasks, comments: m.comments }));
  // drizzle-kit は "public"."tasks" と書くので、テスト用のスキーマの tasks を指すように "public". を外す
  for (const s of statements) await ctx.pool.query(s.replaceAll('"public".', ''));
  return ctx;
}

test('表の名前と列の名前・型', () => {
  assert.ok(m.comments, 'comments を export してください');
  const config = getTableConfig(m.comments);
  assert.equal(config.name, 'comments');
  const cols = Object.fromEntries(config.columns.map((c) => [c.name, c]));
  assert.deepEqual(Object.keys(cols).sort(), ['body', 'created_at', 'id', 'task_id']);
  assert.equal(cols.id.primary, true, 'id を主キーに');
  assert.equal(cols.task_id.getSQLType(), 'integer');
  assert.equal(cols.body.getSQLType(), 'text');
  assert.equal(cols.created_at.getSQLType(), 'timestamp with time zone');
});

test('JavaScript の名前は taskId・body・createdAt', () => {
  assert.ok(m.comments, 'comments を export してください');
  assert.equal(m.comments.taskId?.name, 'task_id');
  assert.equal(m.comments.body?.name, 'body');
  assert.equal(m.comments.createdAt?.name, 'created_at');
});

test('入れると、id と created_at が自動で入る', async (t) => {
  const { db } = await setup(t);
  const [row] = await db.insert(m.comments).values({ taskId: 2, body: '明日返す' }).returning();
  assert.equal(row.id, 1);
  assert.equal(row.taskId, 2);
  assert.ok(row.createdAt instanceof Date, 'createdAt は Date で返る');
});

test('task_id と body は空にできない。body は 1〜500 文字', async (t) => {
  const { db } = await setup(t);
  await assert.rejects(db.insert(m.comments).values({ body: 'x' }), (err) => err.cause?.code === '23502');
  await assert.rejects(db.insert(m.comments).values({ taskId: 2 }), (err) => err.cause?.code === '23502');
  await assert.rejects(db.insert(m.comments).values({ taskId: 2, body: '' }), (err) => err.cause?.constraint === 'comments_body_check');
  await assert.rejects(db.insert(m.comments).values({ taskId: 2, body: 'あ'.repeat(501) }), (err) => err.cause?.constraint === 'comments_body_check');
  await db.insert(m.comments).values({ taskId: 2, body: 'あ'.repeat(500) });
});

test('無いタスクには付けられない。タスクを消すと、そのコメントも消える', async (t) => {
  const { db } = await setup(t);
  await assert.rejects(db.insert(m.comments).values({ taskId: 99, body: 'x' }), (err) => err.cause?.code === '23503');
  await db.insert(m.comments).values([
    { taskId: 2, body: 'a' },
    { taskId: 3, body: 'b' },
  ]);
  await db.delete(tasks).where(eq(tasks.id, 2));
  assert.deepEqual((await db.select({ taskId: m.comments.taskId }).from(m.comments)), [{ taskId: 3 }]);
});
