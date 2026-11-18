// 練習問題5 のテスト。alice と bob の2つのブラウザで確かめる
// 使い方: node --test owner-app.test.ts
//   模範解答を試す: MODULE=../solutions/owner-app.ts node --test owner-app.test.ts
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startApp } from './client.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './owner-app.ts');
const { createOwnerApp }: typeof import('./owner-app.ts') = await import(pathToFileURL(file).href);

const initial = [
  { id: 1, ownerId: 1, title: '牛乳を買う', done: false },
  { id: 2, ownerId: 2, title: 'ねこの病院', done: false },
];

async function setup(t: TestContext) {
  const { browser } = await startApp(t, createOwnerApp(initial));
  const alice = browser();
  const bob = browser();
  assert.equal((await alice.post('/login', { name: 'alice' })).status, 204);
  assert.equal((await bob.post('/login', { name: 'bob' })).status, 204);
  return { alice, bob };
}

test('自分のタスクは読める・書き換えられる・消せる', async (t) => {
  const { alice } = await setup(t);
  assert.equal((await alice.get('/api/tasks/1')).status, 200);
  const patched = await alice.patch('/api/tasks/1', { done: true });
  assert.equal(patched.status, 200);
  assert.deepEqual(patched.json, { id: 1, ownerId: 1, title: '牛乳を買う', done: true });
  assert.equal((await alice.delete('/api/tasks/1')).status, 204);
  assert.equal((await alice.get('/api/tasks/1')).status, 404);
});

test('ほかの人のタスクは、書き換えられない（404。中身も変わらない）', async (t) => {
  const { alice, bob } = await setup(t);
  const res = await alice.patch('/api/tasks/2', { title: '書き換えた' });
  assert.equal(res.status, 404);
  assert.deepEqual(res.json, { detail: 'タスクがありません' });
  assert.deepEqual((await bob.get('/api/tasks/2')).json, { id: 2, ownerId: 2, title: 'ねこの病院', done: false });
});

test('ほかの人のタスクは、消せない（404。残っている）', async (t) => {
  const { alice, bob } = await setup(t);
  assert.equal((await alice.delete('/api/tasks/2')).status, 404);
  assert.equal((await bob.get('/api/tasks/2')).status, 200);
});

test('作るとき、持ち主は入力で決められない（ownerId を送ったら 422）', async (t) => {
  const { alice, bob } = await setup(t);
  assert.equal((await alice.post('/api/tasks', { title: 'bob に押し付ける', ownerId: 2 })).status, 422);
  assert.deepEqual(
    ((await bob.get('/api/tasks')).json as { title: string }[]).map((x) => x.title),
    ['ねこの病院'],
  );
  const created = await alice.post('/api/tasks', { title: '本を返す' });
  assert.equal(created.status, 201);
  assert.deepEqual(created.json, { id: 3, ownerId: 1, title: '本を返す', done: false });
});

test('書き換えで、持ち主や id は変えられない（知らない項目は 422）', async (t) => {
  const { alice } = await setup(t);
  assert.equal((await alice.patch('/api/tasks/1', { ownerId: 2 })).status, 422);
  assert.equal((await alice.patch('/api/tasks/1', { id: 9 })).status, 422);
  assert.deepEqual((await alice.get('/api/tasks/1')).json, { id: 1, ownerId: 1, title: '牛乳を買う', done: false });
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
