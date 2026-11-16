// 練習問題7 のテスト
// 使い方: node --test client.test.ts
//   模範解答を試す: MODULE=../solutions/client.ts node --test client.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './client.ts');
const m = await import(pathToFileURL(file).href);
/** コメントを除いたソース（ルールを確かめるため） */
const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

const task = { id: 1, title: '牛乳を買う', status: 'todo', dueDate: null, createdAt: '2026-11-11T09:00:00.000Z' };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** 決まった応答を順に返す fetch の偽物。呼ばれた URL と init を calls に残す */
function fakeFetch(...replies: (Response | Error)[]) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const fn = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(url), init });
    const reply = replies.shift();
    if (reply === undefined) throw new Error('応答を用意していません');
    if (reply instanceof Error) throw reply;
    return reply;
  };
  return { fn, calls };
}

const BASE = 'http://upstream.test';

/** UpstreamError を投げることを確かめ、kind と status を返す */
async function upstreamError(p: Promise<unknown>): Promise<[string, number | null, unknown]> {
  try {
    await p;
  } catch (err) {
    assert.ok(err instanceof m.UpstreamError, `UpstreamError のはず: ${String(err)}`);
    const e = err as { kind: string; status: number | null; cause: unknown };
    return [e.kind, e.status, e.cause];
  }
  assert.fail('投げるはず');
}

test('getTask: 確かめたタスク。404 なら null', async () => {
  const { fn, calls } = fakeFetch(json(200, { ...task, extra: 'x' }), json(404, { title: 'Not Found' }));
  const client = m.createTaskClient(BASE, fn);
  assert.deepEqual(await client.getTask(1), task, '知らない項目は取り除く');
  assert.equal(await client.getTask(9), null);
  assert.deepEqual(calls.map((c) => c.url), [`${BASE}/api/tasks/1`, `${BASE}/api/tasks/9`]);
});

test('listTasks: 配列を確かめる。status で絞り込む', async () => {
  const { fn, calls } = fakeFetch(json(200, [task, { ...task, id: 2, status: 'done' }]), json(200, []));
  const client = m.createTaskClient(BASE, fn);
  assert.equal((await client.listTasks()).length, 2);
  assert.deepEqual(await client.listTasks('done'), []);
  assert.deepEqual(calls.map((c) => c.url), [`${BASE}/api/tasks`, `${BASE}/api/tasks?status=done`]);
});

test('createTask: JSON で POST し、201 のタスクを返す', async () => {
  const { fn, calls } = fakeFetch(json(201, task));
  const client = m.createTaskClient(BASE, fn);
  assert.deepEqual(await client.createTask({ title: '牛乳を買う' }), task);
  const init = calls[0]?.init;
  assert.equal(init?.method, 'POST');
  assert.equal(new Headers(init?.headers).get('content-type'), 'application/json');
  assert.deepEqual(JSON.parse(String(init?.body)), { title: '牛乳を買う' });
});

test('形の違う応答は shape（cause に ZodError）', async () => {
  const { fn } = fakeFetch(json(200, { ...task, id: '1' }), json(200, [task, { ...task, status: 'waiting' }]), new Response('<html>', { status: 200 }));
  const client = m.createTaskClient(BASE, fn);
  const [kind, status, cause] = await upstreamError(client.getTask(1));
  assert.deepEqual([kind, status], ['shape', 200]);
  assert.ok(cause instanceof Error && cause.name === 'ZodError', 'cause は ZodError');
  assert.deepEqual((await upstreamError(client.listTasks())).slice(0, 2), ['shape', 200]);
  assert.deepEqual((await upstreamError(client.getTask(1))).slice(0, 2), ['shape', 200], 'JSON でない');
});

test('思った状態コードでなければ status。つながらなければ network', async () => {
  const down = new TypeError('fetch failed');
  const { fn } = fakeFetch(json(500, {}), json(200, task), json(503, {}), down);
  const client = m.createTaskClient(BASE, fn);
  assert.deepEqual((await upstreamError(client.getTask(1))).slice(0, 2), ['status', 500]);
  assert.deepEqual((await upstreamError(client.createTask({ title: 'a' }))).slice(0, 2), ['status', 200], 'POST は 201 だけ');
  assert.deepEqual((await upstreamError(client.listTasks())).slice(0, 2), ['status', 503]);
  assert.deepEqual(await upstreamError(client.listTasks()), ['network', null, down]);
});

test('型: tsc のエラーが無い（client.check.ts の確かめを含む）', () => {
  assert.deepEqual(typeErrors([file, checkFileOf(file)]), []);
});

test('ルール: any と as を使っていない', () => {
  assert.doesNotMatch(code, /\bany\b/);
  assert.doesNotMatch(code, /\bas\s+(?!const\b)[A-Za-z]/);
});
