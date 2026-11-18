// 練習問題1 の模範解答: タスクの API の、HTTP のテスト
// 確かめ方（exercises/ で）: node ../../tools/check-tests.ts ../solutions/app.test.ts
import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createMemoryRepo } from '../exercises/memory-repo.ts';
import { createTaskService } from '../exercises/service.ts';
import { startApp, type Started } from '../exercises/start-app.ts';
import type { Task } from '../exercises/types.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? '../exercises/app.ts');
const { createApp }: typeof import('../exercises/app.ts') = await import(pathToFileURL(file).href);

let server: Started;
beforeEach(async () => {
  const service = createTaskService({ repo: createMemoryRepo(), now: () => new Date('2026-12-10T00:00:00Z') });
  server = await startApp(createApp({ service }));
});
afterEach(() => server.close());

function api(urlPath: string, init: RequestInit = {}) {
  return fetch(`${server.base}${urlPath}`, { signal: AbortSignal.timeout(5000), ...init });
}
function send(method: string, urlPath: string, body: unknown) {
  return api(urlPath, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}
async function createTask(title: string): Promise<Task> {
  const res = await send('POST', '/api/tasks', { title });
  assert.equal(res.status, 201);
  return (await res.json()) as Task;
}

// 追加: 一覧
test('GET /api/tasks は { items } で、作った順に返す', async () => {
  const a = await createTask('a');
  const b = await createTask('b');
  const res = await api('/api/tasks');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { items: [a, b] });
});

describe('PUT /api/tasks/:id/status', () => {
  test('状態を変え、変えたタスクを返す', async () => {
    const task = await createTask('牛乳を買う');
    const res = await send('PUT', `/api/tasks/${task.id}/status`, { status: 'doing' });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ...task, status: 'doing' });
  });

  // 追加: 失敗の道を1つずつ
  test('無いタスクは 404', async () => {
    const res = await send('PUT', '/api/tasks/99/status', { status: 'doing' });
    assert.equal(res.status, 404);
  });

  test('知らない状態は 422 で、どの項目かを返す。タスクは変わらない', async () => {
    const task = await createTask('牛乳を買う');
    const res = await send('PUT', `/api/tasks/${task.id}/status`, { status: 'paused' });
    assert.equal(res.status, 422);
    assert.partialDeepStrictEqual(await res.json(), { errors: [{ pointer: '/status' }] });
    assert.deepEqual(await (await api(`/api/tasks/${task.id}`)).json(), task);
  });

  test('doing が3つあると、4つ目は 409', async () => {
    for (const title of ['a', 'b', 'c']) {
      const task = await createTask(title);
      await send('PUT', `/api/tasks/${task.id}/status`, { status: 'doing' });
    }
    const fourth = await createTask('d');
    const res = await send('PUT', `/api/tasks/${fourth.id}/status`, { status: 'doing' });
    assert.equal(res.status, 409);
  });
});

describe('DELETE /api/tasks/:id', () => {
  test('204 で本文は空。その後 GET すると 404', async () => {
    const task = await createTask('牛乳を買う');
    const res = await api(`/api/tasks/${task.id}`, { method: 'DELETE' });
    assert.equal(res.status, 204);
    assert.equal(await res.text(), '');
    assert.equal((await api(`/api/tasks/${task.id}`)).status, 404);
  });

  test('無いタスクは 404', async () => {
    const res = await api('/api/tasks/99', { method: 'DELETE' });
    assert.equal(res.status, 404);
  });
});
