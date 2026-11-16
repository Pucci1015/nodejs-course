// 練習問題3 用: create-table.mjs のテスト
// 使い方: node --test create-table.test.mjs
//   模範解答を試す: MODULE=../solutions/create-table.mjs node --test create-table.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const { createMembers } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './create-table.mjs')).href);

function freshDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(createMembers);
  return db;
}
const insert = (db, cols, values) =>
  db.prepare(`INSERT INTO members (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).run(...values);

test('正しい会員は入る。id は 1 から自動で付き、plan の既定は free', () => {
  const db = freshDb();
  const r = insert(db, ['email', 'name', 'age'], ['alice@example.com', 'alice', 30]);
  assert.equal(Number(r.lastInsertRowid), 1);
  assert.deepEqual({ ...db.prepare('SELECT * FROM members').get() }, { id: 1, email: 'alice@example.com', name: 'alice', age: 30, plan: 'free' });
});

test('age は無くてよい（NULL）。plan に pro も入る', () => {
  const db = freshDb();
  insert(db, ['email', 'name', 'plan'], ['bob@example.com', 'bob', 'pro']);
  assert.deepEqual({ ...db.prepare('SELECT age, plan FROM members').get() }, { age: null, plan: 'pro' });
});

test('email が無い・同じ email の2人目は断る', () => {
  const db = freshDb();
  assert.throws(() => insert(db, ['name'], ['alice']), /NOT NULL/);
  insert(db, ['email', 'name'], ['alice@example.com', 'alice']);
  assert.throws(() => insert(db, ['email', 'name'], ['alice@example.com', 'alice2']), /UNIQUE/);
});

test('name が無い・空・21 文字以上は断る。20 文字は入る', () => {
  const db = freshDb();
  assert.throws(() => insert(db, ['email'], ['a@example.com']), /NOT NULL/);
  assert.throws(() => insert(db, ['email', 'name'], ['b@example.com', '']), /CHECK/);
  assert.throws(() => insert(db, ['email', 'name'], ['c@example.com', 'あ'.repeat(21)]), /CHECK/);
  insert(db, ['email', 'name'], ['d@example.com', 'あ'.repeat(20)]);
});

test('age がマイナスなら断る。0 は入る', () => {
  const db = freshDb();
  assert.throws(() => insert(db, ['email', 'name', 'age'], ['a@example.com', 'a', -1]), /CHECK/);
  insert(db, ['email', 'name', 'age'], ['b@example.com', 'b', 0]);
});

test('plan が free・pro 以外なら断る', () => {
  const db = freshDb();
  assert.throws(() => insert(db, ['email', 'name', 'plan'], ['a@example.com', 'a', 'gold']), /CHECK/);
  assert.throws(() => insert(db, ['email', 'name', 'plan'], ['b@example.com', 'b', null]), /NOT NULL/);
});
