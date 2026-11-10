// 練習問題8のテスト。本物のサービスの代わりに、呼ばれ方を覚える偽物を渡す
// 使い方: node --test tasks-routes.test.mjs
//         MODULE=../solutions/tasks-routes.mjs node --test tasks-routes.test.mjs   （解答例で確かめる）
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { notFound, problemHandler } from '../../lib/problem.mjs';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './tasks-routes.mjs');
const { createTasksRouter, mapDomainErrors } = await import(pathToFileURL(file).href);
const { ConflictError, NotFoundError, ValidationError } = await import(pathToFileURL(path.join(path.dirname(file), 'errors.mjs')).href);

/** 偽物のサービス。calls に呼ばれ方を覚え、next に入れたものを返す（Error なら投げる） */
const calls = [];
let next;
const task = { id: 7, title: '牛乳', status: 'todo' };
const service = Object.fromEntries(
  ['list', 'get', 'create', 'update', 'remove'].map((name) => [
    name,
    async (...args) => {
      calls.push([name, ...args]);
      if (next instanceof Error) throw next;
      return next;
    },
  ]),
);

const app = express();
app.set('env', 'test');
app.use(express.json());
app.use('/api/tasks', createTasksRouter({ service }));
app.use(notFound());
app.use(mapDomainErrors());
app.use(problemHandler({ log: () => {} }));

let server;
let base;
before(async () => {
  await new Promise((r) => {
    server = app.listen(0, '127.0.0.1', r);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.closeAllConnections();
  server.close();
});
beforeEach(() => {
  calls.length = 0;
  next = undefined;
});

async function call(method, url, body, type = 'application/json') {
  const res = await fetch(base + url, {
    method,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    headers: body === undefined ? {} : { 'content-type': type },
    signal: AbortSignal.timeout(2000),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, type: (res.headers.get('content-type') ?? '').split(';')[0], location: res.headers.get('location'), json, text };
}

test('1. 一覧: status をサービスに渡す。知らない名前・値は 400 で、サービスを呼ばない', async () => {
  next = [task];
  const r = await call('GET', '/api/tasks?status=done');
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { items: [task] });
  assert.deepEqual(calls, [['list', { status: 'done' }]]);
  calls.length = 0;
  assert.equal((await call('GET', '/api/tasks?status=later')).status, 400);
  assert.equal((await call('GET', '/api/tasks?stauts=done')).status, 400);
  assert.deepEqual(calls, []);
});

test('2. 1件: id を数にして渡す。形の違う id は 404 で、サービスを呼ばない', async () => {
  next = task;
  assert.equal((await call('GET', '/api/tasks/7')).status, 200);
  assert.deepEqual(calls, [['get', 7]]);
  calls.length = 0;
  for (const id of ['abc', '0', '01', '1.5']) assert.equal((await call('GET', `/api/tasks/${id}`)).status, 404, id);
  assert.deepEqual(calls, []);
});

test('3. 作る: 201 と Location。確かめた後の値を渡す', async () => {
  next = task;
  const r = await call('POST', '/api/tasks', { title: '牛乳', dueDate: null });
  assert.equal(r.status, 201);
  assert.equal(r.location, '/api/tasks/7');
  assert.deepEqual(calls, [['create', { title: '牛乳', dueDate: null }]]);
});

test('4. 形の間違い（型・知らない項目）は 422 で、サービスを呼ばない', async () => {
  for (const body of [{ title: 5 }, { title: 'a', id: 1 }, { title: 'a', owner: 'x' }, []]) {
    const r = await call('POST', '/api/tasks', body);
    assert.equal(r.status, 422, JSON.stringify(body));
    assert.equal(r.type, 'application/problem+json');
  }
  assert.deepEqual(calls, []);
});

test('5. 決まりの確かめ（空白だけの title）はサービスに任せる。ValidationError は 422 と pointer', async () => {
  next = new ValidationError('title は 1〜100 文字です', 'title');
  const r = await call('POST', '/api/tasks', { title: '   ' });
  assert.deepEqual(calls, [['create', { title: '   ' }]]);
  assert.equal(r.status, 422);
  assert.deepEqual(r.json.errors, [{ pointer: '#/title', detail: 'title は 1〜100 文字です' }]);
});

test('6. JSON でないボディは 415（POST・PATCH）', async () => {
  assert.equal((await call('POST', '/api/tasks', 'title=a', 'application/x-www-form-urlencoded')).status, 415);
  assert.equal((await call('PATCH', '/api/tasks/7', 'x', 'text/plain')).status, 415);
  assert.deepEqual(calls, []);
});

test('7. 変える: id と、確かめた後の変更を渡す', async () => {
  next = { ...task, status: 'done' };
  const r = await call('PATCH', '/api/tasks/7', { status: 'done' });
  assert.equal(r.status, 200);
  assert.deepEqual(calls, [['update', 7, { status: 'done' }]]);
  calls.length = 0;
  assert.equal((await call('PATCH', '/api/tasks/7', { version: 9 })).status, 422);
  assert.deepEqual(calls, []);
});

test('8. 消す: 204 で本文なし', async () => {
  const r = await call('DELETE', '/api/tasks/7');
  assert.equal(r.status, 204);
  assert.equal(r.text, '');
  assert.deepEqual(calls, [['remove', 7]]);
});

test('9. NotFoundError は 404、ConflictError は 409（detail はサービスの文）', async () => {
  next = new NotFoundError('タスク 7 はありません');
  let r = await call('GET', '/api/tasks/7');
  assert.equal(r.status, 404);
  assert.equal(r.json.detail, 'タスク 7 はありません');
  next = new ConflictError('作業中のタスクは 3 個までです');
  r = await call('PATCH', '/api/tasks/7', { status: 'doing' });
  assert.equal(r.status, 409);
  assert.equal(r.json.detail, '作業中のタスクは 3 個までです');
});

test('10. 知らないエラーは 500 で、中の文を見せない', async () => {
  next = new Error('DB の接続が切れた');
  const r = await call('DELETE', '/api/tasks/7');
  assert.equal(r.status, 500);
  assert.ok(!r.text.includes('DB の接続'), r.text);
});
