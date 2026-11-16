// 練習問題6 のテスト。query を記録して、決めた行を返す偽物の Queryable を使う
// 使い方: node --test pg-repo.test.ts
//   模範解答を試す: MODULE=../solutions/pg-repo.ts node --test pg-repo.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './pg-repo.ts');
const m = await import(pathToFileURL(file).href);

type Call = { text: string; values: unknown[] | undefined };
/** 送られた SQL を記録し、results を順に返す偽物 */
function fakeDb(...results: { rows: unknown[]; rowCount?: number }[]) {
  const calls: Call[] = [];
  return {
    calls,
    async query(text: string, values?: unknown[]) {
      calls.push({ text: text.replace(/\s+/g, ' ').trim(), values });
      const r = results.shift() ?? { rows: [] };
      return { rows: r.rows, rowCount: r.rowCount ?? r.rows.length };
    },
  };
}

const row = {
  id: 1,
  title: '牛乳を買う',
  status: 'todo',
  due_date: '2026-11-20',
  created_at: new Date('2026-11-11T00:00:00Z'),
  updated_at: new Date('2026-11-11T01:00:00Z'),
  version: 3,
};
const task = {
  id: 1,
  title: '牛乳を買う',
  status: 'todo',
  dueDate: '2026-11-20',
  createdAt: '2026-11-11T00:00:00.000Z',
  updatedAt: '2026-11-11T01:00:00.000Z',
  version: 3,
};

test('get: SELECT して、行をタスクにする。無ければ null', async () => {
  const db = fakeDb({ rows: [row] }, { rows: [] });
  const repo = m.createPgTaskRepo(db);
  assert.deepEqual(await repo.get(1), task);
  assert.equal(await repo.get(9), null);
  assert.deepEqual(db.calls, [
    { text: 'SELECT * FROM tasks WHERE id = $1', values: [1] },
    { text: 'SELECT * FROM tasks WHERE id = $1', values: [9] },
  ]);
});

test('list: 絞り込みを $1・$2 で渡し、id の順', async () => {
  const db = fakeDb({ rows: [row, { ...row, id: 2, due_date: null }] }, { rows: [] }, { rows: [] }, { rows: [] });
  const repo = m.createPgTaskRepo(db);
  assert.deepEqual(await repo.list(), [task, { ...task, id: 2, dueDate: null }]);
  await repo.list({ status: 'done' });
  await repo.list({ dueBefore: '2026-12-01' });
  await repo.list({ status: 'todo', dueBefore: '2026-12-01' });
  assert.deepEqual(db.calls, [
    { text: 'SELECT * FROM tasks ORDER BY id', values: [] },
    { text: 'SELECT * FROM tasks WHERE status = $1 ORDER BY id', values: ['done'] },
    { text: 'SELECT * FROM tasks WHERE due_date < $1 ORDER BY id', values: ['2026-12-01'] },
    { text: 'SELECT * FROM tasks WHERE status = $1 AND due_date < $2 ORDER BY id', values: ['todo', '2026-12-01'] },
  ]);
});

test('create: INSERT … RETURNING *。省略したものは todo と null', async () => {
  const db = fakeDb({ rows: [row] }, { rows: [row] });
  const repo = m.createPgTaskRepo(db);
  assert.deepEqual(await repo.create({ title: '牛乳を買う', dueDate: '2026-11-20' }), task);
  await repo.create({ title: 'x', status: 'doing' });
  assert.deepEqual(db.calls, [
    { text: 'INSERT INTO tasks (title, status, due_date) VALUES ($1, $2, $3) RETURNING *', values: ['牛乳を買う', 'todo', '2026-11-20'] },
    { text: 'INSERT INTO tasks (title, status, due_date) VALUES ($1, $2, $3) RETURNING *', values: ['x', 'doing', null] },
  ]);
});

test('update: 渡した項目だけ SET し、version と updated_at も変える', async () => {
  const db = fakeDb({ rows: [{ ...row, version: 4 }] }, { rows: [] }, { rows: [row] });
  const repo = m.createPgTaskRepo(db);
  assert.equal((await repo.update(1, { status: 'done', dueDate: null })).version, 4);
  assert.equal(await repo.update(1, { title: 'b' }, { expectedVersion: 2 }), null);
  await repo.update(1, {});
  assert.deepEqual(db.calls, [
    { text: 'UPDATE tasks SET status = $1, due_date = $2, version = version + 1, updated_at = now() WHERE id = $3 RETURNING *', values: ['done', null, 1] },
    { text: 'UPDATE tasks SET title = $1, version = version + 1, updated_at = now() WHERE id = $2 AND version = $3 RETURNING *', values: ['b', 1, 2] },
    { text: 'UPDATE tasks SET version = version + 1, updated_at = now() WHERE id = $1 RETURNING *', values: [1] },
  ]);
});

test('remove: rowCount が 1 以上なら true', async () => {
  const db = fakeDb({ rows: [], rowCount: 1 }, { rows: [], rowCount: 0 });
  const repo = m.createPgTaskRepo(db);
  assert.equal(await repo.remove(1), true);
  assert.equal(await repo.remove(1), false);
  assert.deepEqual(db.calls[0], { text: 'DELETE FROM tasks WHERE id = $1', values: [1] });
});

test('型: tsc のエラーが無い（pg-repo.check.ts の確かめを含む）', () => {
  assert.deepEqual(typeErrors([file, checkFileOf(file)]), []);
});

test('ルール: any と as を使っていない。値は SQL の文字列に入れない', () => {
  const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\bany\b/);
  assert.doesNotMatch(code, /\bas\s+(?!const\b)[A-Za-z]/);
  assert.doesNotMatch(code, /\$\{\s*(id|patch|input|filter|title)\b/, '値は $1 で渡す');
});
