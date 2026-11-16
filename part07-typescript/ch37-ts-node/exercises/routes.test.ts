// 練習問題3 のテスト。空いているポートで起動して、fetch で確かめる
// 使い方: node --test routes.test.ts
//   模範解答を試す: MODULE=../solutions/routes.ts node --test routes.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { createFakeRepo, task } from './fake-repo.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './routes.ts');
const m = await import(pathToFileURL(file).href);

/** 応答の JSON。テストでは中の形を自由に確かめたいので、any として受け取る */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const readJson = (res: Response): Promise<any> => res.json();

async function start(t: test.TestContext) {
  const repo = createFakeRepo([task(1), task(2, { status: 'done' }), task(3)]);
  const app = express();
  app.use('/api/tasks', m.createTaskRouter(repo));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const { port } = server.address() as AddressInfo;
  return { base: `http://127.0.0.1:${port}/api/tasks`, repo };
}

test('GET /: 一覧。?status= で絞り込む', async (t) => {
  const { base, repo } = await start(t);
  const all = await fetch(base);
  assert.equal(all.status, 200);
  assert.deepEqual((await readJson(all)).map((x: { id: number }) => x.id), [1, 2, 3]);
  const done = await fetch(`${base}?status=done`);
  assert.deepEqual((await readJson(done)).map((x: { id: number }) => x.id), [2]);
  assert.deepEqual(repo.calls.at(-1), ['list', { status: 'done' }]);
});

test('GET /: 知らない status、2つ以上の status は 400', async (t) => {
  const { base } = await start(t);
  const r1 = await fetch(`${base}?status=waiting`);
  assert.equal(r1.status, 400);
  assert.deepEqual(await readJson(r1), { error: 'status は todo・doing・done のどれかです' });
  assert.equal((await fetch(`${base}?status=todo&status=done`)).status, 400);
});

test('GET /:id: 1件。無い・数でない id は 404', async (t) => {
  const { base } = await start(t);
  const r = await fetch(`${base}/2`);
  assert.equal(r.status, 200);
  assert.equal((await readJson(r)).status, 'done');
  for (const id of ['9', 'abc', '0', '1.5', '01']) {
    const res = await fetch(`${base}/${id}`);
    assert.equal(res.status, 404, id);
    assert.deepEqual(await readJson(res), { error: 'タスクが見つかりません' });
  }
});

test('DELETE /:id: 消したら 204、無ければ 404', async (t) => {
  const { base, repo } = await start(t);
  assert.equal((await fetch(`${base}/3`, { method: 'DELETE' })).status, 204);
  assert.equal((await fetch(`${base}/3`, { method: 'DELETE' })).status, 404);
  assert.deepEqual(repo.tasks.map((x) => x.id), [1, 2]);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});

test('ルール: any と as を使っていない', () => {
  const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\bany\b/);
  assert.doesNotMatch(code, /\bas\s+(?!const\b)[A-Za-z]/);
});
