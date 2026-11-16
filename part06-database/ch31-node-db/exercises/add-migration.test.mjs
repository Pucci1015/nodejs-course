// 練習問題3 用: add-migration.mjs のテスト
// 使い方: node --test add-migration.test.mjs
//   模範解答を試す: MODULE=../solutions/add-migration.mjs node --test add-migration.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const { MIGRATIONS, migrate } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './add-migration.mjs')).href);

const version = (db) => db.prepare('PRAGMA user_version').get().user_version;
const columns = (db) => db.prepare('PRAGMA table_info(tasks)').all().map((c) => c.name);
const now = '2026-11-11T00:00:00.000Z';

test('手順が 5 つあり、空のデータベースを版 5 にできる', () => {
  assert.equal(MIGRATIONS.length, 5);
  const db = new DatabaseSync(':memory:');
  assert.deepEqual(migrate(db), { from: 0, to: 5 });
  assert.equal(version(db), 5);
  assert.ok(columns(db).includes('priority'), 'priority の列がありません');
});

test('priority: 書かなければ 2。1〜3 以外と NULL は断る', () => {
  const db = new DatabaseSync(':memory:');
  migrate(db);
  const insert = db.prepare('INSERT INTO tasks (title, created_at, updated_at, priority) VALUES (?, ?, ?, ?)');
  const { id } = db.prepare('INSERT INTO tasks (title, created_at, updated_at) VALUES (?, ?, ?) RETURNING id').get('a', now, now);
  assert.equal(db.prepare('SELECT priority FROM tasks WHERE id = ?').get(id).priority, 2);
  insert.run('b', now, now, 1);
  insert.run('c', now, now, 3);
  assert.throws(() => insert.run('d', now, now, 4), /CHECK/);
  assert.throws(() => insert.run('e', now, now, 0), /CHECK/);
  assert.throws(() => insert.run('f', now, now, null), /NOT NULL/);
});

test('status と due_date で探すと、インデックスを使う', () => {
  const db = new DatabaseSync(':memory:');
  migrate(db);
  const plan = db
    .prepare("EXPLAIN QUERY PLAN SELECT id FROM tasks WHERE status = 'todo' ORDER BY due_date")
    .all()
    .map((r) => r.detail)
    .join(' / ');
  assert.match(plan, /SEARCH tasks USING (COVERING )?INDEX \w+ \(status=\?\)/);
  assert.doesNotMatch(plan, /TEMP B-TREE/, `並べ替えにもインデックスを使えていません: ${plan}`);
});

test('版 3 で使っていたデータベースに足すと、今ある行は priority 2 になり、データは消えない', () => {
  const db = new DatabaseSync(':memory:');
  migrate(db, MIGRATIONS.slice(0, 3));
  db.prepare('INSERT INTO tasks (title, created_at, updated_at) VALUES (?, ?, ?)').run('前からある', now, now);
  assert.deepEqual(migrate(db), { from: 3, to: 5 });
  assert.deepEqual({ ...db.prepare('SELECT title, priority FROM tasks').get() }, { title: '前からある', priority: 2 });
});

test('2回動かしても、何もしない', () => {
  const db = new DatabaseSync(':memory:');
  migrate(db);
  assert.deepEqual(migrate(db), { from: 5, to: 5 });
});
