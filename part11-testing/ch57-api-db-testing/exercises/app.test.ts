// 練習問題1: タスクの API の、HTTP のテストを書く
// 使い方: node --test app.test.ts
//         node ../../tools/check-tests.ts app.test.ts
import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createMemoryRepo } from './memory-repo.ts';
import { createTaskService } from './service.ts';
import { startApp, type Started } from './start-app.ts';
import type { Task } from './types.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './app.ts');
const { createApp }: typeof import('./app.ts') = await import(pathToFileURL(file).href);

// テストごとに、空のデータでアプリを起動する
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
/** タスクを1つ作って返す（準備に使う） */
async function createTask(title: string): Promise<Task> {
  const res = await send('POST', '/api/tasks', { title });
  assert.equal(res.status, 201);
  return (await res.json()) as Task;
}

test('PUT /api/tasks/:id/status で状態を変え、変えたタスクを返す', async () => {
  const task = await createTask('牛乳を買う');
  const res = await send('PUT', `/api/tasks/${task.id}/status`, { status: 'doing' });

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ...task, status: 'doing' });
});

// ここを書く（テストを書き足す）
