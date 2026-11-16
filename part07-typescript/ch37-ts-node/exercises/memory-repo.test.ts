// 練習問題5 のテスト
// 使い方: node --test memory-repo.test.ts
//   模範解答を試す: MODULE=../solutions/memory-repo.ts node --test memory-repo.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './memory-repo.ts');
const m = await import(pathToFileURL(file).href);
/** コメントを除いたソース（ルールを確かめるため） */
const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

let clock = 0;
const now = () => new Date(Date.UTC(2026, 10, 11, 0, 0, clock++));
const at = (s: number) => new Date(Date.UTC(2026, 10, 11, 0, 0, s)).toISOString();

test('create: id は 1 から。status と dueDate は省略できる', async () => {
  clock = 0;
  const repo = m.createMemoryTaskRepo(now);
  assert.deepEqual(await repo.create({ title: '牛乳を買う' }), {
    id: 1, title: '牛乳を買う', status: 'todo', dueDate: null, createdAt: at(0), updatedAt: at(0), version: 1,
  });
  const t2 = await repo.create({ title: '本を返す', status: 'doing', dueDate: '2026-11-20' });
  assert.equal(t2.id, 2);
  assert.equal(t2.status, 'doing');
  assert.equal(t2.dueDate, '2026-11-20');
});

test('get と list（id の順、絞り込み）', async () => {
  const repo = m.createMemoryTaskRepo(now);
  await repo.create({ title: 'a', dueDate: '2026-11-20' });
  await repo.create({ title: 'b', status: 'done', dueDate: '2026-11-10' });
  await repo.create({ title: 'c' });
  assert.equal((await repo.get(2)).title, 'b');
  assert.equal(await repo.get(9), null);
  assert.deepEqual((await repo.list()).map((t: { id: number }) => t.id), [1, 2, 3]);
  assert.deepEqual((await repo.list({ status: 'todo' })).map((t: { id: number }) => t.id), [1, 3]);
  assert.deepEqual((await repo.list({ dueBefore: '2026-11-15' })).map((t: { id: number }) => t.id), [2], '締め切りの無いものは入らない');
  assert.deepEqual((await repo.list({ status: 'todo', dueBefore: '2026-11-15' })), []);
});

test('update: 渡した項目だけ変え、version を 1 増やし、updatedAt を今に', async () => {
  clock = 0;
  const repo = m.createMemoryTaskRepo(now);
  await repo.create({ title: 'a', dueDate: '2026-11-20' });
  const t = await repo.update(1, { status: 'done', dueDate: null });
  assert.deepEqual(t, { id: 1, title: 'a', status: 'done', dueDate: null, createdAt: at(0), updatedAt: at(1), version: 2 });
  assert.equal(await repo.update(9, { title: 'x' }), null);
});

test('update: expectedVersion が違えば null で、何も変えない', async () => {
  const repo = m.createMemoryTaskRepo(now);
  await repo.create({ title: 'a' });
  assert.equal(await repo.update(1, { title: 'b' }, { expectedVersion: 5 }), null);
  assert.equal((await repo.get(1)).title, 'a');
  assert.equal((await repo.update(1, { title: 'b' }, { expectedVersion: 1 })).version, 2);
});

test('返したタスクを書き換えても、中のデータは変わらない', async () => {
  const repo = m.createMemoryTaskRepo(now);
  const t = await repo.create({ title: 'a' });
  t.title = '書き換えた';
  (await repo.list())[0].status = 'done';
  assert.deepEqual(await repo.get(1).then((x: { title: string; status: string }) => [x.title, x.status]), ['a', 'todo']);
});

test('remove', async () => {
  const repo = m.createMemoryTaskRepo(now);
  await repo.create({ title: 'a' });
  assert.equal(await repo.remove(1), true);
  assert.equal(await repo.remove(1), false);
  assert.deepEqual(await repo.list(), []);
  assert.equal((await repo.create({ title: 'b' })).id, 2, '消した id は使い回さない');
});

test('型: tsc のエラーが無い（memory-repo.check.ts の確かめを含む）', () => {
  assert.deepEqual(typeErrors([file, checkFileOf(file)]), []);
});

test('ルール: any と as を使っていない', () => {
  assert.doesNotMatch(code, /\bany\b/);
  assert.doesNotMatch(code, /\bas\s+(?!const\b)[A-Za-z]/);
});
