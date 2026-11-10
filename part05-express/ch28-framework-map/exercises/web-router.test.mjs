// 練習問題8のテスト。サーバを起動せず、Request を作って router.fetch に渡すだけで確かめられる
// 使い方: node --test web-router.test.mjs
//         MODULE=../solutions/web-router.mjs node --test web-router.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { createRouter } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './web-router.mjs')).href);

const req = (method, p, init = {}) => new Request(`http://localhost${p}`, { method, ...init });

function setup() {
  return createRouter()
    .get('/tasks', () => Response.json({ items: [] }))
    .post('/tasks', async (request) => Response.json(await request.json(), { status: 201 }))
    .get('/tasks/:id', (request, { params }) => Response.json({ id: params.id }))
    .delete('/tasks/:id', () => new Response(null, { status: 204 }))
    .get('/files/:name', (request, { params }) => new Response(params.name))
    .get('/boom', () => {
      throw new Error('DB の接続が切れた');
    });
}

test('1. メソッドとパスで選び、パラメータを渡す', async () => {
  const r = setup();
  assert.deepEqual(await (await r.fetch(req('GET', '/tasks/7'))).json(), { id: '7' });
  const created = await r.fetch(req('POST', '/tasks', { body: '{"title":"a"}', headers: { 'content-type': 'application/json' } }));
  assert.equal(created.status, 201);
  assert.deepEqual(await created.json(), { title: 'a' });
});

test('2. パスはあるがメソッドが違えば 405 と Allow', async () => {
  const r = setup();
  const res = await r.fetch(req('PUT', '/tasks/7'));
  assert.equal(res.status, 405);
  assert.deepEqual(res.headers.get('allow').split(', ').sort(), ['DELETE', 'GET', 'HEAD']);
});

test('3. パスが無ければ 404', async () => {
  assert.equal((await setup().fetch(req('GET', '/nothing'))).status, 404);
});

test('4. HEAD は GET のハンドラで答え、本文を送らない', async () => {
  const res = await setup().fetch(req('HEAD', '/tasks'));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/json');
  assert.equal(await res.text(), '');
});

test('5. パラメータの %xx を戻す。壊れた %xx は 400', async () => {
  const r = setup();
  assert.equal(await (await r.fetch(req('GET', '/files/%E7%89%9B%E4%B9%B3.txt'))).text(), '牛乳.txt');
  assert.equal((await r.fetch(req('GET', '/files/%E7%89'))).status, 400);
});

test('6. ハンドラが投げたら 500。中の文は見せない', async () => {
  const res = await setup().fetch(req('GET', '/boom'));
  assert.equal(res.status, 500);
  assert.ok(!(await res.text()).includes('DB'));
});

test('7. ミドルウェアは、登録した順に動き、await next() で後ろを待てる', async () => {
  const log = [];
  const r = setup()
    .use(async (request, next) => {
      log.push('a1');
      const res = await next();
      log.push('a2');
      const out = new Response(res.body, res); // Response の headers は変えられないので、作り直す
      out.headers.set('X-Powered-By-Me', 'yes');
      return out;
    })
    .use(async (request, next) => {
      log.push('b1');
      const res = await next();
      log.push('b2');
      return res;
    });
  const res = await r.fetch(req('GET', '/tasks'));
  assert.deepEqual(log, ['a1', 'b1', 'b2', 'a2']);
  assert.equal(res.headers.get('x-powered-by-me'), 'yes');
});

test('8. ミドルウェアは、next を呼ばずに返して、止められる', async () => {
  const r = setup().use(async (request, next) => (request.headers.get('authorization') ? next() : new Response('Unauthorized', { status: 401 })));
  assert.equal((await r.fetch(req('GET', '/tasks'))).status, 401);
  assert.equal((await r.fetch(req('GET', '/tasks', { headers: { authorization: 'Bearer dev-only-token' } }))).status, 200);
});
