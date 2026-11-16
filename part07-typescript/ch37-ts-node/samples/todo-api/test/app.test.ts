// 7節: todo-api のテスト。空いているポート（0）で起動して、fetch で確かめる
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.ts';
import { createMemoryTaskRepo } from '../src/memory-repo.ts';

async function start(t: test.TestContext): Promise<string> {
  const repo = createMemoryTaskRepo(() => new Date('2026-11-11T00:00:00Z'));
  await repo.create({ title: '牛乳を買う' });
  const server = createApp(repo).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const { port } = server.address() as AddressInfo; // listen(0) の後の address() は、いつも AddressInfo
  return `http://127.0.0.1:${port}/api/tasks`;
}

test('一覧と1件', async (t) => {
  const base = await start(t);
  const list = await fetch(base);
  assert.equal(list.status, 200);
  assert.deepEqual(await list.json(), [{ id: 1, title: '牛乳を買う', status: 'todo', createdAt: '2026-11-11T00:00:00.000Z' }]);
  assert.equal((await fetch(`${base}/1`)).status, 200);
  assert.equal((await fetch(`${base}/9`)).status, 404);
  assert.equal((await fetch(`${base}/abc`)).status, 404);
  assert.equal((await fetch(`${base}?status=waiting`)).status, 400);
});

test('作って消す', async (t) => {
  const base = await start(t);
  const res = await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: ' 本を返す ' }) });
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('location'), '/api/tasks/2');
  assert.equal((await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"title": 1}' })).status, 422);
  assert.equal((await fetch(`${base}/2`, { method: 'DELETE' })).status, 204);
  assert.equal((await fetch(`${base}/2`, { method: 'DELETE' })).status, 404);
});
