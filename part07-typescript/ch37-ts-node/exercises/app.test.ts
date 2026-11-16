// 練習問題8 のテスト。空いているポートで起動して、fetch で確かめる
// 使い方: node --test app.test.ts
//   模範解答を試す: MODULE=../solutions/app.ts node --test app.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { TaskRepo } from './task-repo.ts';
import { createFakeRepo, task } from './fake-repo.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './app.ts');
const m = await import(pathToFileURL(file).href);

/** 応答の JSON。テストでは中の形を自由に確かめたいので、any として受け取る */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const readJson = (res: Response): Promise<any> => res.json();

async function start(t: test.TestContext, repo: TaskRepo = createFakeRepo([task(1), task(2, { status: 'done', dueDate: '2026-11-10' }), task(3, { version: 4 })])) {
  const server = m.createApp(repo).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  const send = (method: string, url: string, body?: unknown, headers: Record<string, string> = {}) =>
    fetch(`${base}${url}`, {
      method,
      headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
  return { send, repo };
}

async function problem(res: Response, status: number) {
  assert.equal(res.status, status);
  assert.match(res.headers.get('content-type') ?? '', /^application\/problem\+json/);
  const body = await readJson(res);
  assert.equal(body.status, status);
  assert.equal(body.type, 'about:blank');
  return body;
}

test('GET 一覧と絞り込み', async (t) => {
  const { send } = await start(t);
  const ids = async (url: string) => (await readJson(await send('GET', url))).map((x: { id: number }) => x.id);
  assert.deepEqual(await ids('/api/tasks'), [1, 2, 3]);
  assert.deepEqual(await ids('/api/tasks?status=done'), [2]);
  assert.deepEqual(await ids('/api/tasks?dueBefore=2026-11-11'), [2]);
  assert.equal((await problem(await send('GET', '/api/tasks?status=waiting'), 400)).title, 'Bad Request');
  await problem(await send('GET', '/api/tasks?dueBefore=11/11'), 400);
});

test('GET 1件は ETag 付き。無ければ 404', async (t) => {
  const { send } = await start(t);
  const res = await send('GET', '/api/tasks/3');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('etag'), '"4"');
  assert.equal((await problem(await send('GET', '/api/tasks/9'), 404)).title, 'Not Found');
  await problem(await send('GET', '/api/tasks/abc'), 404);
  await problem(await send('GET', '/api/nothing'), 404);
});

test('POST: 201・Location・ETag。題名は前後の空白を除く', async (t) => {
  const { send, repo } = await start(t);
  const res = await send('POST', '/api/tasks', { title: '  本を返す ', dueDate: '2026-11-20' });
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('location'), '/api/tasks/4');
  assert.equal(res.headers.get('etag'), '"1"');
  const body = await readJson(res);
  assert.equal(body.title, '本を返す');
  assert.equal(body.dueDate, '2026-11-20');
  assert.deepEqual((repo as unknown as { calls: unknown[][] }).calls.at(-1), ['create', { title: '本を返す', dueDate: '2026-11-20' }]);
});

test('POST: 間違いを全部集めて 422', async (t) => {
  const { send } = await start(t);
  const body = await problem(await send('POST', '/api/tasks', { title: '', status: 'waiting', dueDate: '2026/11/20', memo: 'x' }), 422);
  assert.equal(body.title, 'Unprocessable Content');
  assert.deepEqual(body.errors.map((e: { field: string }) => e.field).toSorted(), ['dueDate', 'memo', 'status', 'title']);
  const b2 = await problem(await send('POST', '/api/tasks', {}), 422);
  assert.deepEqual(b2.errors.map((e: { field: string }) => e.field), ['title']);
  await problem(await send('POST', '/api/tasks', [1, 2]), 422);
  await problem(await send('POST', '/api/tasks', { title: 'あ'.repeat(101) }), 422);
});

test('POST: 読めない JSON は 400', async (t) => {
  const { send } = await start(t);
  await problem(await send('POST', '/api/tasks', '{"title": '), 400);
});

test('PATCH: If-Match で守る（無い 404、版が違う 412）', async (t) => {
  const { send } = await start(t);
  const ok = await send('PATCH', '/api/tasks/3', { status: 'doing' }, { 'if-match': '"4"' });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('etag'), '"5"');
  assert.equal((await readJson(ok)).status, 'doing');
  assert.equal((await problem(await send('PATCH', '/api/tasks/3', { status: 'done' }, { 'if-match': '"4"' }), 412)).title, 'Precondition Failed');
  await problem(await send('PATCH', '/api/tasks/9', { status: 'done' }), 404);
  await problem(await send('PATCH', '/api/tasks/1', {}), 422);
  await problem(await send('PATCH', '/api/tasks/1', { title: null }), 422);
  const noMatch = await send('PATCH', '/api/tasks/1', { dueDate: null });
  assert.equal(noMatch.status, 200, 'If-Match が無ければ、版を確かめずに変える');
});

test('DELETE', async (t) => {
  const { send } = await start(t);
  assert.equal((await send('DELETE', '/api/tasks/1')).status, 204);
  await problem(await send('DELETE', '/api/tasks/1'), 404);
});

test('思っていなかったエラーは 500。中身は見せない', async (t) => {
  const broken = createFakeRepo([]);
  broken.list = async () => {
    throw new Error('秘密の接続文字列 postgres://app:dev-only-password@db');
  };
  const original = console.error;
  console.error = () => {}; // テストの出力を汚さないように、このテストの間だけ黙らせる
  t.after(() => {
    console.error = original;
  });
  const { send } = await start(t, broken);
  const res = await send('GET', '/api/tasks');
  const text = await res.text();
  assert.equal(res.status, 500);
  assert.doesNotMatch(text, /秘密|postgres|password/);
  assert.equal(JSON.parse(text).title, 'Internal Server Error');
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});

test('ルール: any を使っていない', () => {
  const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\bany\b/);
});
