// 練習問題5のテスト
// 使い方: node --test problem.test.mjs
//         MODULE=../solutions/problem.mjs node --test problem.test.mjs   （解答例で確かめる）
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { z } from 'zod';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './problem.mjs')).href);

const logged = [];
const app = express();
app.set('env', 'test');
app.use(express.json({ limit: '1kb' }));
app.get('/p/404', () => {
  throw new m.HttpProblem(404, { detail: 'タスク 9 はありません' });
});
app.get('/p/custom', () => {
  throw new m.HttpProblem(409, {
    type: 'https://example.com/problems/duplicate',
    title: '同じ題名のタスクがあります',
    detail: '「牛乳」はもうあります',
    headers: { 'Retry-After': '5' },
  });
});
app.post('/zod', (req, res) => {
  z.strictObject({ title: z.string().min(1, 'title を入力'), tags: z.array(z.string().min(1, '空のタグ')) }).parse(req.body);
  res.sendStatus(204);
});
app.get('/boom', () => {
  throw new Error('secret: postgres://app:dev-only@db');
});
app.get('/half', (req, res) => {
  res.write('途中まで');
  throw new Error('途中で失敗');
});
app.get('/u/:id', (req, res) => res.send(req.params.id));
app.use(m.notFound());
app.use(m.problemHandler({ log: (e) => logged.push(e) }));

let server;
let base;
before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.closeAllConnections();
  server.close();
});
beforeEach(() => {
  logged.length = 0;
});

async function call(method, url, { body, type = 'application/json' } = {}) {
  const res = await fetch(base + url, { method, body, headers: body ? { 'content-type': type } : {}, signal: AbortSignal.timeout(2000) });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: res.status, type: res.headers.get('content-type') ?? '', headers: res.headers, json, text };
}

test('1. HttpProblem は problem+json で、type・title・status・detail・instance を返す', async () => {
  const r = await call('GET', '/p/404?x=1');
  assert.equal(r.status, 404);
  assert.equal(r.type, 'application/problem+json; charset=utf-8');
  assert.deepEqual(r.json, { type: 'about:blank', title: 'Not Found', status: 404, detail: 'タスク 9 はありません', instance: '/p/404?x=1' });
});

test('2. type と title を自分で決められる。headers も付ける', async () => {
  const r = await call('GET', '/p/custom');
  assert.equal(r.status, 409);
  assert.equal(r.json.type, 'https://example.com/problems/duplicate');
  assert.equal(r.json.title, '同じ題名のタスクがあります');
  assert.equal(r.headers.get('retry-after'), '5');
});

test('3. どのルートにもないパスは 404 の problem（detail に メソッド と パス）', async () => {
  const r = await call('DELETE', '/nothing?q=1');
  assert.equal(r.status, 404);
  assert.ok(r.type.startsWith('application/problem+json'));
  assert.equal(r.json.title, 'Not Found');
  assert.equal(r.json.detail, 'DELETE /nothing はありません');
  assert.equal(r.json.instance, '/nothing?q=1');
});

test('4. ZodError は 422。errors に JSON Pointer（#/tags/1）と detail', async () => {
  const r = await call('POST', '/zod', { body: JSON.stringify({ title: '', tags: ['a', ''], extra: 1 }) });
  assert.equal(r.status, 422);
  assert.equal(r.json.title, 'Unprocessable Content');
  assert.deepEqual(r.json.errors, [
    { pointer: '#/title', detail: 'title を入力' },
    { pointer: '#/tags/1', detail: '空のタグ' },
    { pointer: '#', detail: r.json.errors[2].detail },
  ]);
  assert.match(r.json.errors[2].detail, /extra/);
});

test('5. JSON Pointer では ~ を ~0、/ を ~1 にする', async () => {
  const app2 = express();
  app2.get('/', () => {
    z.object({ 'a/b': z.object({ 'c~d': z.string() }) }).parse({ 'a/b': { 'c~d': 1 } });
  });
  app2.use(m.problemHandler({ log() {} }));
  const s = await new Promise((resolve) => {
    const srv = app2.listen(0, '127.0.0.1', () => resolve(srv));
  });
  try {
    const res = await fetch(`http://127.0.0.1:${s.address().port}/`, { signal: AbortSignal.timeout(2000) });
    const json = await res.json();
    assert.equal(json.errors[0].pointer, '#/a~1b/c~0d');
  } finally {
    s.closeAllConnections();
    s.close();
  }
});

test('6. express.json() の失敗: 壊れた JSON は 400、大きすぎると 413、知らない charset は 415', async () => {
  const a = await call('POST', '/zod', { body: '{"title":' });
  assert.equal(a.status, 400);
  assert.equal(a.json.title, 'Bad Request');
  assert.equal(typeof a.json.detail, 'string');
  const b = await call('POST', '/zod', { body: JSON.stringify({ t: 'a'.repeat(2000) }) });
  assert.equal(b.status, 413);
  assert.equal(b.json.title, 'Content Too Large');
  const c = await call('POST', '/zod', { body: '{}', type: 'application/json; charset=shift_jis' });
  assert.equal(c.status, 415);
  assert.ok(c.type.startsWith('application/problem+json'));
});

test('7. Express の 400（壊れた %xx）も problem にする', async () => {
  const r = await call('GET', '/u/%zz');
  assert.equal(r.status, 400);
  assert.ok(r.type.startsWith('application/problem+json'));
});

test('8. 予想していない例外は 500。detail を出さず、log に渡す', async () => {
  const r = await call('GET', '/boom');
  assert.equal(r.status, 500);
  assert.deepEqual(Object.keys(r.json).sort(), ['instance', 'status', 'title', 'type']);
  assert.ok(!r.text.includes('secret'));
  assert.equal(logged.length, 1);
  assert.match(logged[0].message, /secret/);
});

test('9. 400 番台は log に渡さない（客の間違いで、ログをうめない）', async () => {
  await call('GET', '/p/404');
  await call('POST', '/zod', { body: '{"title":' });
  assert.equal(logged.length, 0);
});

test('10. 途中まで送った後のエラーは、接続を切る', async () => {
  await assert.rejects(async () => {
    const res = await fetch(`${base}/half`, { signal: AbortSignal.timeout(2000) });
    await res.text();
  });
});

test('11. HttpProblem の status は 400〜599 の整数だけ（それ以外は RangeError）', () => {
  assert.throws(() => new m.HttpProblem(200), RangeError);
  assert.throws(() => new m.HttpProblem(404.5), RangeError);
  assert.throws(() => new m.HttpProblem('404'), RangeError);
  assert.equal(new m.HttpProblem(418).status, 418);
});

test('12. 表に無いステータスの title は「Error」', async () => {
  const app2 = express();
  app2.get('/', () => {
    throw new m.HttpProblem(418);
  });
  app2.use(m.problemHandler({ log() {} }));
  const s = await new Promise((resolve) => {
    const srv = app2.listen(0, '127.0.0.1', () => resolve(srv));
  });
  try {
    const res = await fetch(`http://127.0.0.1:${s.address().port}/`, { signal: AbortSignal.timeout(2000) });
    const json = await res.json();
    assert.equal(res.status, 418);
    assert.equal(json.title, 'Error');
    assert.equal(json.detail, undefined);
  } finally {
    s.closeAllConnections();
    s.close();
  }
});
