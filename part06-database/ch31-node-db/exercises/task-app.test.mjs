// 練習問題8 用: task-app.mjs のテスト（ポート 0 で立てるので、9428 は使わない）
// 使い方: node --test task-app.test.mjs
//   模範解答を試す: MODULE=../solutions/task-app.mjs node --test task-app.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTaskDb } from './task-db.mjs';

const { createTaskApp } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './task-app.mjs')).href);

// 新しいデータベースでサーバを立て、fetch する関数を返す
async function start(t) {
  const server = createTaskApp(createTaskDb()).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  return async (method, url, { body, headers = {} } = {}) => {
    const res = await fetch(base + url, {
      method,
      headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
  };
}

test('GET /api/tasks/:id: タスクと、ETag に "version"。無ければ 404', async (t) => {
  const call = await start(t);
  const r = await call('GET', '/api/tasks/3');
  assert.equal(r.status, 200);
  assert.equal(r.body.title, '部屋の掃除');
  assert.equal(r.headers.get('etag'), '"2"');
  assert.equal((await call('GET', '/api/tasks/99')).status, 404);
  assert.equal((await call('GET', '/api/tasks/abc')).status, 404);
});

test('POST /api/tasks: 201、Location、ETag "1"', async (t) => {
  const call = await start(t);
  const r = await call('POST', '/api/tasks', { body: { title: '花に水をやる', dueDate: '2026-12-01' } });
  assert.equal(r.status, 201);
  assert.equal(r.headers.get('location'), '/api/tasks/6');
  assert.equal(r.headers.get('etag'), '"1"');
  assert.deepEqual([r.body.id, r.body.title, r.body.status, r.body.dueDate, r.body.version], [6, '花に水をやる', 'todo', '2026-12-01', 1]);
});

test('POST /api/tasks: 題名が重なれば 409、長さが違えば・文字列でなければ 422', async (t) => {
  const call = await start(t);
  assert.equal((await call('POST', '/api/tasks', { body: { title: '本を返す' } })).status, 409);
  assert.equal((await call('POST', '/api/tasks', { body: { title: '' } })).status, 422);
  assert.equal((await call('POST', '/api/tasks', { body: { title: 'x'.repeat(101) } })).status, 422);
  assert.equal((await call('POST', '/api/tasks', { body: {} })).status, 422);
  assert.equal((await call('POST', '/api/tasks', { body: { title: 5 } })).status, 422);
  const r = await call('POST', '/api/tasks', { body: { title: '本を返す' } });
  assert.equal(r.headers.get('content-type'), 'application/problem+json; charset=utf-8');
  assert.doesNotMatch(r.body.detail, /constraint|tasks\./, 'データベースのエラーの文を、そのまま見せない');
});

test('PATCH: If-Match が合えば変え、新しい ETag。無ければ 428、古ければ 412', async (t) => {
  const call = await start(t);
  const ok = await call('PATCH', '/api/tasks/2', { body: { status: 'done' }, headers: { 'if-match': '"1"' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('etag'), '"2"');
  assert.equal(ok.body.status, 'done');
  assert.ok(ok.body.completedAt, 'done にしたら completedAt が入る');
  assert.equal((await call('PATCH', '/api/tasks/2', { body: { title: 'x' } })).status, 428);
  assert.equal((await call('PATCH', '/api/tasks/2', { body: { title: 'x' }, headers: { 'if-match': '"1"' } })).status, 412);
  assert.equal((await call('PATCH', '/api/tasks/2', { body: { title: 'x' }, headers: { 'if-match': 'abc' } })).status, 400);
  assert.equal((await call('PATCH', '/api/tasks/99', { body: { title: 'x' }, headers: { 'if-match': '"1"' } })).status, 404);
  assert.equal((await call('GET', '/api/tasks/2')).body.title, '本を返す', '断ったときは変えない');
});

test('PATCH: 決まりに合わない値は 422・409（データベースの制約）', async (t) => {
  const call = await start(t);
  assert.equal((await call('PATCH', '/api/tasks/2', { body: { status: 'paused' }, headers: { 'if-match': '"1"' } })).status, 422);
  assert.equal((await call('PATCH', '/api/tasks/2', { body: { title: '報告書を書く' }, headers: { 'if-match': '"1"' } })).status, 409);
});

test('DELETE: If-Match が合えば 204。無ければ 428、古ければ 412', async (t) => {
  const call = await start(t);
  assert.equal((await call('DELETE', '/api/tasks/3')).status, 428);
  assert.equal((await call('DELETE', '/api/tasks/3', { headers: { 'if-match': '"1"' } })).status, 412);
  assert.equal((await call('DELETE', '/api/tasks/3', { headers: { 'if-match': '"2"' } })).status, 204);
  assert.equal((await call('GET', '/api/tasks/3')).status, 404);
});
