// 練習問題6 のテスト
// 使い方: node --test route.test.ts
//   模範解答を試す: MODULE=../solutions/route.ts node --test route.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './route.ts');
const m = await import(pathToFileURL(file).href);
/** コメントを除いたソース（ルールを確かめるため） */
const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
import express, { type ErrorRequestHandler } from 'express';
import { z } from 'zod';

/** 応答の JSON。テストでは中の形を自由に確かめたいので、any として受け取る */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const readJson = (res: Response): Promise<any> => res.json();

const Id = z.object({ id: z.string().regex(/^[1-9][0-9]*$/).transform(Number) });
const ListQuery = z.strictObject({ limit: z.string().regex(/^[0-9]+$/).transform(Number).pipe(z.number().max(100)).default(20) });
const NewItem = z.strictObject({ name: z.string().min(1), tags: z.array(z.string()).default([]) });

async function start(t: test.TestContext) {
  const calls: unknown[] = [];
  const app = express();
  app.use(express.json());
  app.get('/items', m.route({ query: ListQuery }, async (input: unknown) => {
    calls.push(input);
    return { status: 200, body: input };
  }));
  app.get('/items/:id', m.route({ params: Id }, async (input: unknown) => {
    calls.push(input);
    return { status: 200, body: input };
  }));
  app.post('/items', m.route({ body: NewItem }, async (input: { body: { name: string } }) => {
    calls.push(input);
    if (input.body.name === 'boom') throw new Error('こわれた');
    return { status: 201, body: input.body, headers: { location: '/items/7', etag: '"1"' } };
  }));
  app.delete('/items/:id', m.route({ params: Id }, async () => ({ status: 204 })));
  const onError: ErrorRequestHandler = (_err, _req, res, _next) => {
    res.status(500).json({ error: 'こわれた' });
  };
  app.use(onError);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  const post = (body: unknown) => fetch(`${base}/items`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { base, post, calls };
}

async function problem(res: Response, status: number) {
  assert.equal(res.status, status);
  assert.match(res.headers.get('content-type') ?? '', /^application\/problem\+json/);
  const body = await readJson(res);
  assert.equal(body.type, 'about:blank');
  assert.equal(body.status, status);
  return body;
}

test('params: 確かめた後の値（数）をハンドラに渡す。だめなら 404（errors 無し）', async (t) => {
  const { base, calls } = await start(t);
  const res = await fetch(`${base}/items/12`);
  assert.equal(res.status, 200);
  assert.deepEqual(await readJson(res), { params: { id: 12 } }, 'スキーマの無いもの（query・body）は undefined なので、JSON には出ない');
  const bad = await problem(await fetch(`${base}/items/abc`), 404);
  assert.equal(bad.title, 'Not Found');
  assert.equal(bad.errors, undefined);
  assert.equal(calls.length, 1, 'だめなときは、ハンドラを呼ばない');
});

test('query: 決まりの値も入る。だめなら 400 と errors', async (t) => {
  const { base } = await start(t);
  assert.deepEqual(await readJson(await fetch(`${base}/items`)), { query: { limit: 20 } });
  assert.deepEqual(await readJson(await fetch(`${base}/items?limit=5`)), { query: { limit: 5 } });
  const bad = await problem(await fetch(`${base}/items?limit=500`), 400);
  assert.equal(bad.title, 'Bad Request');
  assert.deepEqual(bad.errors.map((e: { pointer: string }) => e.pointer), ['/limit']);
  assert.equal(typeof bad.errors[0].detail, 'string');
});

test('body: 201・ヘッダ・ボディ。だめなら 422 と errors', async (t) => {
  const { post, calls } = await start(t);
  const res = await post({ name: 'ねじ' });
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('location'), '/items/7');
  assert.equal(res.headers.get('etag'), '"1"');
  assert.deepEqual(await readJson(res), { name: 'ねじ', tags: [] });
  assert.deepEqual(calls.at(-1), { params: undefined, query: undefined, body: { name: 'ねじ', tags: [] } });
  const bad = await problem(await post({ name: '', tags: [1] }), 422);
  assert.equal(bad.title, 'Unprocessable Content');
  assert.deepEqual(bad.errors.map((e: { pointer: string }) => e.pointer), ['/name', '/tags/0']);
});

test('body が undefined なら、ボディ無し', async (t) => {
  const { base } = await start(t);
  const res = await fetch(`${base}/items/1`, { method: 'DELETE' });
  assert.equal(res.status, 204);
  assert.equal(await res.text(), '');
});

test('ハンドラが投げたエラーは、エラーのミドルウェアに渡る', async (t) => {
  const { post } = await start(t);
  const res = await post({ name: 'boom' });
  assert.equal(res.status, 500);
  assert.deepEqual(await readJson(res), { error: 'こわれた' });
});

test('型: tsc のエラーが無い（route.check.ts の確かめを含む）', () => {
  assert.deepEqual(typeErrors([file, checkFileOf(file)]), []);
});

test('ルール: any を使っていない。as は1回まで', () => {
  assert.doesNotMatch(code, /\bany\b/);
  assert.ok((code.match(/\bas\s+(?!const\b)[A-Za-z]/g) ?? []).length <= 1, 'as は1回まで');
});
