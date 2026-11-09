// 練習問題2のテスト。createTasksApp で作ったアプリを listen(0)（空いているポート）で起動して、fetch で確かめる
// 使い方: node --test tasks-app.test.mjs
//         MODULE=../solutions/tasks-app.mjs node --test tasks-app.test.mjs   （解答例で確かめる）
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTaskStore } from './tasks-store.mjs';

const { createTasksApp } = await import(
  pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './tasks-app.mjs')).href
);

let server;
let base;
const errors = []; // テストの間に console.error に書かれたもの
const originalError = console.error;

beforeEach(async () => {
  errors.length = 0;
  console.error = (...args) => errors.push(args.map(String).join(' '));
  const app = createTasksApp({ store: createTaskStore({ now: () => new Date('2026-11-05T12:00:00.000Z') }) });
  app.set('env', 'test'); // 既定のエラーハンドラがスタックを書かないように（自分のエラーハンドラがあれば関係ない）
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  console.error = originalError;
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

// ひな形が応答しないときにテストが止まらないよう、2秒で打ち切る
async function call(method, url, { json, body, headers = {} } = {}) {
  const init = { method, headers: { ...headers }, signal: AbortSignal.timeout(2000) };
  if (json !== undefined) {
    init.body = JSON.stringify(json);
    init.headers['content-type'] = 'application/json';
  } else if (body !== undefined) {
    init.body = body;
  }
  const res = await fetch(base + url, init);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  return { status: res.status, headers: res.headers, data, text };
}

const isJson = (r) => (r.headers.get('content-type') ?? '').startsWith('application/json');

test('1. GET /api/tasks は 200 で、2件の配列', async () => {
  const r = await call('GET', '/api/tasks');
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.map((t) => t.id), [1, 2]);
});

test('2. ?done=true / ?done=false で絞り込む。それ以外の値は 400（JSON）', async () => {
  assert.deepEqual((await call('GET', '/api/tasks?done=true')).data.map((t) => t.id), [2]);
  assert.deepEqual((await call('GET', '/api/tasks?done=false')).data.map((t) => t.id), [1]);
  for (const q of ['done=yes', 'done=', 'done=true&done=false']) {
    const r = await call('GET', `/api/tasks?${q}`);
    assert.equal(r.status, 400, q);
    assert.ok(isJson(r), `${q} の 400 は JSON`);
  }
});

test('3. GET /api/tasks/1 は 200、無い id は 404（JSON）', async () => {
  const r = await call('GET', '/api/tasks/1');
  assert.equal(r.status, 200);
  assert.equal(r.data.title, '牛乳を買う');
  const n = await call('GET', '/api/tasks/99');
  assert.equal(n.status, 404);
  assert.ok(isJson(n));
  assert.equal(n.data.error, 'not_found');
});

test('4. id が正の整数の形でなければ 400（abc、1.5、0、-1、01、1e3）', async () => {
  for (const id of ['abc', '1.5', '0', '-1', '01', '1e3']) {
    const r = await call('GET', `/api/tasks/${id}`);
    assert.equal(r.status, 400, id);
    assert.ok(isJson(r), id);
  }
});

test('5. POST /api/tasks は 201、Location、作ったタスク', async () => {
  const r = await call('POST', '/api/tasks', { json: { title: '  卵を買う  ' } });
  assert.equal(r.status, 201);
  assert.equal(r.headers.get('location'), '/api/tasks/3');
  assert.deepEqual(r.data, { id: 3, title: '卵を買う', done: false, createdAt: '2026-11-05T12:00:00.000Z' });
  assert.equal((await call('GET', '/api/tasks/3')).status, 200);
});

test('6. POST の title が無い・文字列でない・空白だけ・101文字以上なら 422（error: validation）', async () => {
  for (const json of [{}, { title: 3 }, { title: '   ' }, { title: 'あ'.repeat(101) }, []]) {
    const r = await call('POST', '/api/tasks', { json });
    assert.equal(r.status, 422, JSON.stringify(json).slice(0, 30));
    assert.equal(r.data.error, 'validation');
    assert.equal(typeof r.data.message, 'string');
  }
  assert.equal((await call('POST', '/api/tasks', { json: { title: 'あ'.repeat(100) } })).status, 201);
});

test('7. POST の Content-Type が JSON でなければ 415、JSON が壊れていれば 400（どちらも JSON）', async () => {
  const a = await call('POST', '/api/tasks', { body: 'title=卵', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
  assert.equal(a.status, 415);
  assert.ok(isJson(a));
  const b = await call('POST', '/api/tasks', { body: '{"title":', headers: { 'content-type': 'application/json' } });
  assert.equal(b.status, 400);
  assert.ok(isJson(b));
  assert.equal(b.data.error, 'bad_request');
});

test('8. PATCH /api/tasks/1 で title と done を変える。無い id は 404', async () => {
  const r = await call('PATCH', '/api/tasks/1', { json: { done: true } });
  assert.equal(r.status, 200);
  assert.equal(r.data.done, true);
  assert.equal(r.data.title, '牛乳を買う');
  const t = await call('PATCH', '/api/tasks/1', { json: { title: '豆乳を買う' } });
  assert.equal(t.data.title, '豆乳を買う');
  assert.equal(t.data.done, true);
  assert.equal((await call('PATCH', '/api/tasks/99', { json: { done: true } })).status, 404);
});

test('9. PATCH の done が真偽値でない・title が正しくない・知らない項目があるなら 422', async () => {
  for (const json of [{ done: 'true' }, { title: '' }, { id: 5 }, { done: true, extra: 1 }]) {
    const r = await call('PATCH', '/api/tasks/1', { json });
    assert.equal(r.status, 422, JSON.stringify(json));
  }
  assert.equal((await call('GET', '/api/tasks/1')).data.done, false, '422 のときは何も変えない');
});

test('10. DELETE /api/tasks/2 は 204（本文なし）。もう一度消すと 404', async () => {
  const r = await call('DELETE', '/api/tasks/2');
  assert.equal(r.status, 204);
  assert.equal(r.text, '');
  assert.equal((await call('DELETE', '/api/tasks/2')).status, 404);
  assert.equal((await call('GET', '/api/tasks/2')).status, 404);
});

test('11. どのルートにもあてはまらなければ 404（JSON、error: not_found）', async () => {
  for (const [m, u] of [['GET', '/api/nothing'], ['GET', '/'], ['PUT', '/api/tasks/1']]) {
    const r = await call(m, u);
    assert.equal(r.status, 404, `${m} ${u}`);
    assert.ok(isJson(r), `${m} ${u}`);
    assert.equal(r.data.error, 'not_found');
  }
});

test('12. 壊れた %xx（/api/tasks/%E0%A4%A）は 400（JSON）', async () => {
  const r = await call('GET', '/api/tasks/%E0%A4%A');
  assert.equal(r.status, 400);
  assert.ok(isJson(r));
});

test('13. 100kb を超えるボディは 413（JSON）', async () => {
  const r = await call('POST', '/api/tasks', { json: { title: 'a'.repeat(200_000) } });
  assert.equal(r.status, 413);
  assert.ok(isJson(r));
});

test('14. X-Powered-By を付けない。HEAD /api/tasks は 200', async () => {
  const r = await call('GET', '/api/tasks');
  assert.equal(r.headers.get('x-powered-by'), null);
  assert.equal((await call('HEAD', '/api/tasks')).status, 200);
});

test('15. ルートの中で例外が起きたら 500（JSON、error: internal）。詳しいことは本文に出さず、console.error に書く', async () => {
  const app = createTasksApp({
    store: {
      ...createTaskStore(),
      list() {
        throw new Error('保存場所が壊れた: secret-detail');
      },
    },
  });
  app.set('env', 'test');
  const s = await new Promise((resolve) => {
    const srv = app.listen(0, '127.0.0.1', () => resolve(srv));
  });
  try {
    const res = await fetch(`http://127.0.0.1:${s.address().port}/api/tasks`, { signal: AbortSignal.timeout(2000) });
    const text = await res.text();
    assert.equal(res.status, 500);
    assert.ok((res.headers.get('content-type') ?? '').startsWith('application/json'), 'JSON で返す');
    assert.equal(JSON.parse(text).error, 'internal');
    assert.ok(!text.includes('secret-detail'), '例外の文を本文に出さない');
    assert.ok(errors.some((e) => e.includes('secret-detail')), 'console.error に書く');
  } finally {
    s.closeAllConnections();
    await new Promise((resolve) => s.close(resolve));
  }
});
