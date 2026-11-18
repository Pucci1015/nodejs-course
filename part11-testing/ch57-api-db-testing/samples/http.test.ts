// 第57章 2〜3節: HTTP のテスト。テストの中でアプリを起動し、fetch で頼む（データはメモリの偽物）
// 使い方: node --test samples/http.test.ts
import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.ts';
import { createMemoryRepo } from './memory-repo.ts';
import { createTaskService } from './service.ts';
import { startApp, type Started } from './start-app.ts';

// テストごとに、空のメモリのリポジトリでアプリを起動し直す（前のテストのデータが残らない）
let server: Started;
beforeEach(async () => {
  const service = createTaskService({
    repo: createMemoryRepo(),
    now: () => new Date('2026-12-10T00:00:00Z'),
  });
  server = await startApp(createApp({ service }));
});
afterEach(() => server.close());

// fetch を短く書く部品。応答が来なければ 5 秒で失敗させる（第4部の決まり）
function api(path: string, init: RequestInit = {}) {
  return fetch(`${server.base}${path}`, { signal: AbortSignal.timeout(5000), ...init });
}
function post(path: string, body: unknown) {
  return api(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

describe('POST /api/tasks', () => {
  test('201 と Location と、作ったタスク', async () => {
    const res = await post('/api/tasks', { title: '牛乳を買う', dueDate: '2026-12-24' });

    assert.equal(res.status, 201);
    assert.equal(res.headers.get('location'), '/api/tasks/1');
    assert.deepEqual(await res.json(), { id: 1, title: '牛乳を買う', status: 'todo', dueDate: '2026-12-24' });
  });

  test('題名が空なら 422 で、どの項目かを返す', async () => {
    const res = await post('/api/tasks', { title: '   ' });

    assert.equal(res.status, 422);
    assert.match(res.headers.get('content-type') ?? '', /^application\/problem\+json/);
    const body = await res.json();
    // 3節: 一部の項目だけを確かめる
    assert.partialDeepStrictEqual(body, { status: 422, errors: [{ pointer: '/title' }] });
  });

  test('同じ題名は 409', async () => {
    await post('/api/tasks', { title: '牛乳を買う' });
    const res = await post('/api/tasks', { title: '牛乳を買う' });
    assert.equal(res.status, 409);
  });
});

describe('GET /api/tasks/:id', () => {
  test('無ければ 404', async () => {
    const res = await api('/api/tasks/99');
    assert.equal(res.status, 404);
  });

  test('id が数でなければ 404（500 にしない）', async () => {
    const res = await api('/api/tasks/abc');
    assert.equal(res.status, 404);
  });
});
