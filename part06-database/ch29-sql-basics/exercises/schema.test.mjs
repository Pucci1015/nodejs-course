// 練習問題6 用: schema.mjs のテスト
// 使い方: node --test schema.test.mjs
//   模範解答を試す: MODULE=../solutions/schema.mjs node --test schema.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const { schema } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './schema.mjs')).href);

function freshDb() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(schema);
  db.exec(`
    INSERT INTO users (id, email) VALUES (1, 'alice@example.com'), (2, 'bob@example.com');
    INSERT INTO tasks (id, user_id, title) VALUES (1, 1, '牛乳を買う'), (2, 1, '本を返す'), (3, 2, '部屋の掃除');
    INSERT INTO tags (id, name) VALUES (1, '買い物'), (2, '家');
    INSERT INTO task_tags (task_id, tag_id) VALUES (1, 1), (1, 2), (3, 2);
  `);
  return db;
}
const count = (db, table) => db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;

test('4つのテーブルに、決めた列で入る。status の既定は todo', () => {
  const db = freshDb();
  assert.deepEqual([count(db, 'users'), count(db, 'tasks'), count(db, 'tags'), count(db, 'task_tags')], [2, 3, 2, 3]);
  assert.equal(db.prepare('SELECT status FROM tasks WHERE id = 1').get().status, 'todo');
});

test('users.email と tags.name は、同じものを2つ入れられない', () => {
  const db = freshDb();
  assert.throws(() => db.exec(`INSERT INTO users (email) VALUES ('alice@example.com')`), /UNIQUE/);
  assert.throws(() => db.exec(`INSERT INTO tags (name) VALUES ('家')`), /UNIQUE/);
});

test('tasks: いない user のタスク・空の題名・決まっていない status は断る', () => {
  const db = freshDb();
  assert.throws(() => db.exec(`INSERT INTO tasks (user_id, title) VALUES (99, 'x')`), /FOREIGN KEY/);
  assert.throws(() => db.exec(`INSERT INTO tasks (user_id, title) VALUES (1, '')`), /CHECK/);
  assert.throws(() => db.exec(`INSERT INTO tasks (user_id, title, status) VALUES (1, 'x', 'later')`), /CHECK/);
});

test('task_tags: 同じ組を2回・無いタスクや無いタグとの組は断る', () => {
  const db = freshDb();
  assert.throws(() => db.exec('INSERT INTO task_tags (task_id, tag_id) VALUES (1, 1)'), /UNIQUE|PRIMARY KEY/);
  assert.throws(() => db.exec('INSERT INTO task_tags (task_id, tag_id) VALUES (99, 1)'), /FOREIGN KEY/);
  assert.throws(() => db.exec('INSERT INTO task_tags (task_id, tag_id) VALUES (2, 99)'), /FOREIGN KEY/);
});

test('user を消すと、その人のタスクと、タスクのタグの組も消える', () => {
  const db = freshDb();
  db.exec('DELETE FROM users WHERE id = 1');
  assert.equal(count(db, 'tasks'), 1);
  assert.equal(count(db, 'task_tags'), 1);
  assert.equal(count(db, 'tags'), 2, 'タグそのものは消えない');
});

test('タグを消すと、そのタグの組だけが消える', () => {
  const db = freshDb();
  db.exec('DELETE FROM tags WHERE id = 2');
  assert.equal(count(db, 'task_tags'), 1);
  assert.equal(count(db, 'tasks'), 3);
});
