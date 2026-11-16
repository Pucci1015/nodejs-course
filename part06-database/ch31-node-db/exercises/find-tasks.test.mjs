// 練習問題1 用: find-tasks.mjs のテスト
// 使い方: node --test find-tasks.test.mjs
//   模範解答を試す: MODULE=../solutions/find-tasks.mjs node --test find-tasks.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTaskDb } from './task-db.mjs';

const f = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './find-tasks.mjs')).href);

test('findByStatus: status が同じタスクの title を、id の順に', () => {
  const db = createTaskDb();
  assert.deepEqual(f.findByStatus(db, 'todo'), ['本を返す', "Let's ストレッチ", '報告書を書く']);
  assert.deepEqual(f.findByStatus(db, 'doing'), ['部屋の掃除']);
  assert.deepEqual(f.findByStatus(db, 'paused'), []);
});

test('searchTitle: title に word を含むタスク。アポストロフィを含む word でも動く', () => {
  const db = createTaskDb();
  assert.deepEqual(f.searchTitle(db, 'を'), [
    { id: 1, title: '牛乳を買う' },
    { id: 2, title: '本を返す' },
    { id: 5, title: '報告書を書く' },
  ]);
  assert.deepEqual(f.searchTitle(db, "Let's"), [{ id: 4, title: "Let's ストレッチ" }]);
  assert.deepEqual(f.searchTitle(db, "'"), [{ id: 4, title: "Let's ストレッチ" }]);
  assert.deepEqual(f.searchTitle(db, '昼寝'), []);
});

test('dueBetween: due_date が from 以上 to 以下のタスクの id', () => {
  const db = createTaskDb();
  assert.deepEqual(f.dueBetween(db, '2026-11-01', '2026-11-12'), [1, 5, 2]);
  assert.deepEqual(f.dueBetween(db, '2026-11-13', '2026-11-30'), [3]);
});

test('overdue: 終わっていなくて、date より前が締め切りのタスクを、締め切りの順に limit 個まで', () => {
  const db = createTaskDb();
  assert.deepEqual(f.overdue(db, { date: '2026-11-13', limit: 10 }), ['報告書を書く', '本を返す']);
  assert.deepEqual(f.overdue(db, { date: '2026-11-13', limit: 1 }), ['報告書を書く']);
  assert.deepEqual(f.overdue(db, { date: '2026-11-01', limit: 10 }), []);
});

test('SQL に値を書き込んでいない（ファイルの中に ${ を使った SQL が無い）', async () => {
  const fs = await import('node:fs/promises');
  const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './find-tasks.mjs');
  const src = await fs.readFile(file, 'utf8');
  const bad = src.split('\n').filter((line) => /(SELECT|WHERE|LIKE|LIMIT)[^\n]*\$\{/.test(line));
  assert.deepEqual(bad, [], 'SQL の中で ${…} を使っている行があります');
});
