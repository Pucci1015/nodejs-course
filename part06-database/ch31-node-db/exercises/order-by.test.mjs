// 練習問題2 用: order-by.mjs のテスト
// 使い方: node --test order-by.test.mjs
//   模範解答を試す: MODULE=../solutions/order-by.mjs node --test order-by.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTaskDb } from './task-db.mjs';

const o = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './order-by.mjs')).href);

test('orderByClause: 名前だけなら小さい順、- が付いたら大きい順。最後に id で順を決める', () => {
  assert.equal(o.orderByClause('dueDate'), 'due_date ASC, id ASC');
  assert.equal(o.orderByClause('-createdAt'), 'created_at DESC, id ASC');
  assert.equal(o.orderByClause('title'), 'title ASC, id ASC');
});

test('orderByClause: id のときは id だけ。何も渡さなければ id の小さい順', () => {
  assert.equal(o.orderByClause('id'), 'id ASC');
  assert.equal(o.orderByClause('-id'), 'id DESC');
  assert.equal(o.orderByClause(undefined), 'id ASC');
});

test('orderByClause: 決めた名前以外は RangeError', () => {
  for (const bad of ['owner', 'due_date', 'title desc', '--id', '', 'toString', '__proto__']) {
    assert.throws(() => o.orderByClause(bad), RangeError, `${JSON.stringify(bad)} が通ってしまいました`);
  }
});

test('listIds: その順で id を返す', () => {
  const db = createTaskDb();
  assert.deepEqual(o.listIds(db, '-id'), [5, 4, 3, 2, 1]);
  assert.deepEqual(o.listIds(db, 'dueDate'), [4, 1, 5, 2, 3]); // NULL は先頭
  assert.deepEqual(o.listIds(db, '-createdAt'), [5, 4, 3, 2, 1]);
  assert.throws(() => o.listIds(db, 'owner'), RangeError);
});
