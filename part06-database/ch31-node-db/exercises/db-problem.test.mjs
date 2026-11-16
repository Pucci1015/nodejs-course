// 練習問題7 用: db-problem.mjs のテスト
// 使い方: node --test db-problem.test.mjs
//   模範解答を試す: MODULE=../solutions/db-problem.mjs node --test db-problem.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTaskDb } from './task-db.mjs';

const { toProblem } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './db-problem.mjs')).href);

const now = '2026-11-11T00:00:00.000Z';
// SQL を動かして、起きたエラーを返す
function errorOf(sql, ...params) {
  const db = createTaskDb();
  try {
    db.prepare(sql).run(...params);
  } catch (err) {
    return err;
  }
  throw new Error('エラーが起きませんでした');
}
const insert = 'INSERT INTO tasks (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)';

test('題名が重なる（UNIQUE）→ 409', () => {
  assert.deepEqual(toProblem(errorOf(insert, '本を返す', 'todo', now, now)), { status: 409, detail: '同じ題名の、終わっていないタスクがあります' });
});

test('id が重なる（PRIMARY KEY）→ 409。何がぶつかったかは書かない', () => {
  const err = errorOf('INSERT INTO tasks (id, title, created_at, updated_at) VALUES (1, ?, ?, ?)', '新しい', now, now);
  assert.deepEqual(toProblem(err), { status: 409, detail: 'ほかのデータとぶつかりました' });
});

test('CHECK → 422。どの決まりかで文を変える', () => {
  assert.deepEqual(toProblem(errorOf(insert, '', 'todo', now, now)), { status: 422, detail: 'title は 1〜100 文字です' });
  assert.deepEqual(toProblem(errorOf(insert, '昼寝', 'sleeping', now, now)), { status: 422, detail: 'status は todo・doing・done のどれかです' });
});

test('NOT NULL → 422。列の名前を入れる', () => {
  assert.deepEqual(toProblem(errorOf(insert, null, 'todo', now, now)), { status: 422, detail: 'title は必ず送ってください' });
  assert.deepEqual(toProblem(errorOf(insert, '昼寝', 'todo', null, now)), { status: 422, detail: 'created_at は必ず送ってください' });
});

test('制約ではないデータベースのエラー → 500。エラーの文は見せない', () => {
  const p = toProblem(errorOf('SELECT * FROM taskz'));
  assert.equal(p.status, 500);
  assert.doesNotMatch(p.detail, /taskz/);
});

test('データベースのエラーでなければ null', () => {
  assert.equal(toProblem(new Error('ふつうのエラー')), null);
  assert.equal(toProblem(new TypeError('x')), null);
  assert.equal(toProblem(undefined), null);
});
