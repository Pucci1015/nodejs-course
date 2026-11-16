// 練習問題8 用: app-schema.mjs と、drizzle-kit が作った drizzle/ のテスト（PostgreSQL が動いている必要がある）
// 使い方: node --test app-schema.test.mjs
//   模範解答を試す: MODULE=../solutions/app-schema.mjs node --test app-schema.test.mjs
//   （マイグレーションは、MODULE のファイルと同じフォルダの drizzle/ を見る）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import { createTestDb } from './drizzle-test.mjs';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './app-schema.mjs');
const m = await import(pathToFileURL(file).href);
const dir = path.join(path.dirname(file), 'drizzle');

const readJournal = async () => JSON.parse(await fs.readFile(path.join(dir, 'meta', '_journal.json'), 'utf8'));
const readSql = async (tag) => fs.readFile(path.join(dir, `${tag}.sql`), 'utf8');
// drizzle-kit は、1つのファイルの中の SQL の区切りに --> statement-breakpoint と書く
const statements = (text) => text.split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean);

test('スキーマ: priority は integer・NOT NULL・DEFAULT 2。tasks_priority_check がある', () => {
  const config = getTableConfig(m.tasks);
  const priority = config.columns.find((c) => c.name === 'priority');
  assert.ok(priority, 'priority の列がありません');
  assert.equal(m.tasks.priority, priority, 'JavaScript の名前も priority に');
  assert.equal(priority.getSQLType(), 'integer');
  assert.equal(priority.notNull, true);
  assert.equal(priority.default, 2);
  assert.ok(config.checks.some((c) => c.name === 'tasks_priority_check'), 'tasks_priority_check がありません');
});

test('drizzle/: マイグレーションが2つ。2つ目は add_priority', async () => {
  const journal = await readJournal();
  const tags = journal.entries.map((e) => e.tag);
  assert.equal(tags.length, 2, `マイグレーションが ${tags.length} 個あります: ${tags.join(', ')}（作り直すときは README を見てください）`);
  assert.equal(tags[0], '0000_create_tasks');
  assert.equal(tags[1], '0001_add_priority', 'npx drizzle-kit generate --name add_priority で作ってください');
  assert.doesNotMatch(await readSql(tags[0]), /priority/, '0000 は書き換えない（一度動かしたマイグレーションは変えない）');
  const added = await readSql(tags[1]);
  assert.match(added, /ADD COLUMN "priority" integer DEFAULT 2 NOT NULL/);
  assert.match(added, /tasks_priority_check/);
});

test('drizzle/: スキーマを最後に変えた後で generate してある（作り忘れが無い）', async () => {
  const journal = await readJournal();
  const last = journal.entries.at(-1);
  const snapshot = JSON.parse(await fs.readFile(path.join(dir, 'meta', `${String(last.idx).padStart(4, '0')}_snapshot.json`), 'utf8'));
  const pending = await generateMigration(snapshot, generateDrizzleJson({ tasks: m.tasks }));
  assert.deepEqual(pending, [], 'スキーマに、まだマイグレーションになっていない変更があります。npx drizzle-kit generate を動かしてください');
});

test('今ある行には 2 が入り、1〜3 の外は入らない', async (t) => {
  const { pool } = await createTestDb(t, { tables: false });
  const [first, second] = (await readJournal()).entries.map((e) => e.tag);
  for (const s of statements(await readSql(first))) await pool.query(s);
  // 0001 を動かす前に、もう行がある（本番のデータベースの気持ちで）
  await pool.query("INSERT INTO tasks (title) VALUES ('本を返す'), ('部屋の掃除')");
  for (const s of statements(await readSql(second))) await pool.query(s);
  assert.deepEqual((await pool.query('SELECT title, priority FROM tasks ORDER BY id')).rows, [
    { title: '本を返す', priority: 2 },
    { title: '部屋の掃除', priority: 2 },
  ]);
  await pool.query("INSERT INTO tasks (title, priority) VALUES ('急ぐ', 1), ('いつか', 3)");
  for (const bad of [0, 4]) {
    await assert.rejects(pool.query('INSERT INTO tasks (title, priority) VALUES ($1, $2)', ['x', bad]), { constraint: 'tasks_priority_check' });
  }
});

test('Drizzle の migrate() で、空のデータベースに2つとも当てられる', async (t) => {
  const { db, pool, schemaName } = await createTestDb(t, { tables: false });
  // 記録の表（__drizzle_migrations）も、テスト用のスキーマに作る
  await migrate(db, { migrationsFolder: dir, migrationsSchema: schemaName });
  const [row] = await db.insert(m.tasks).values({ title: '窓を拭く' }).returning();
  assert.equal(row.priority, 2);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM __drizzle_migrations')).rows[0].n, 2);
  await migrate(db, { migrationsFolder: dir, migrationsSchema: schemaName }); // 2回目は何もしない
});
