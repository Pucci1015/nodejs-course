// 練習問題3 用: tasks-router.mjs のテスト。/api/tasks の下に付けて、fetch で確かめる
// 使い方: node --test tasks-router.test.mjs
//   模範解答を試す: MODULE=../solutions/tasks-router.mjs node --test tasks-router.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';

const { createTasksRouter } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './tasks-router.mjs')).href);

const tasks = [
  { id: 1, title: '牛乳を買う', done: false },
  { id: 2, title: '第24章を読む', done: true },
  { id: 3, title: '洗濯', done: false },
];
const app = express();
app.set('env', 'test');
app.use('/api/tasks', createTasksRouter(tasks));
app.use((req, res) => res.status(404).json({ error: 'app_not_found' }));

let server;
let base;
before(async () => {
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

const get = (url) => fetch(base + url, { signal: AbortSignal.timeout(2000) });

test('createTasksRouter は Router（関数）を返す', () => {
  assert.equal(typeof createTasksRouter([]), 'function');
});

test('GET /api/tasks: 全部', async () => {
  const res = await get('/api/tasks');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), tasks);
});

test('GET /api/tasks?done=true・false: 絞り込む', async () => {
  assert.deepEqual((await (await get('/api/tasks?done=true')).json()).map((t) => t.id), [2]);
  assert.deepEqual((await (await get('/api/tasks?done=false')).json()).map((t) => t.id), [1, 3]);
});

test('GET /api/tasks?done=yes: 400', async () => {
  const res = await get('/api/tasks?done=yes');
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'bad_request');
});

test('GET /api/tasks/2: 1件', async () => {
  const res = await get('/api/tasks/2');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), tasks[1]);
});

test('GET /api/tasks/9: 404 の JSON（Router の中で返す）', async () => {
  const res = await get('/api/tasks/9');
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error, 'not_found');
});
