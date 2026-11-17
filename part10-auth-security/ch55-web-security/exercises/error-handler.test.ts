// 練習問題7 のテスト
// 使い方: node --test error-handler.test.ts
//   模範解答を試す: MODULE=../solutions/error-handler.ts node --test error-handler.test.ts
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { startApp } from './client.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './error-handler.ts');
const { createErrorHandler, redact }: typeof import('./error-handler.ts') = await import(pathToFileURL(file).href);

const SECRET_MESSAGE = 'つなげません: postgres://app:dev-only-password@127.0.0.1:5433/taskapi';

async function setup(t: TestContext, isProduction: boolean) {
  const logs: unknown[] = [];
  const app = express();
  app.use(express.json());
  app.get('/boom', () => {
    throw new Error(SECRET_MESSAGE);
  });
  app.get('/string', () => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- Error でない値が投げられたときを試す
    throw 'こわれた';
  });
  app.get('/half', (_req, res) => {
    res.write('途中まで');
    throw new Error('送っている途中');
  });
  app.post('/json', (_req, res) => res.json({ ok: true }));
  app.use(createErrorHandler({ isProduction, log: (e) => logs.push(e), newId: () => 'err-1' }));
  const { browser, port } = await startApp(t, app);
  return { b: browser(), logs, port };
}

test('redact: URL のパスワードと Bearer のトークンを *** に', () => {
  assert.equal(redact(SECRET_MESSAGE), 'つなげません: postgres://app:***@127.0.0.1:5433/taskapi');
  assert.equal(redact('Authorization: Bearer eyJhbGciOi.abc.def です'), 'Authorization: Bearer *** です');
  assert.equal(redact('redis://default:dev-only@127.0.0.1:6380 と https://example.com/a@b'), 'redis://default:***@127.0.0.1:6380 と https://example.com/a@b');
});

test('本番の 500: 中身を返さず、errorId だけ。ログには隠した stack と method・path', async (t) => {
  const { b, logs } = await setup(t, true);
  const res = await b.get('/boom');
  assert.equal(res.status, 500);
  assert.deepEqual(res.json, { title: 'サーバの中でエラーが起きました', status: 500, errorId: 'err-1' });
  assert.equal(logs.length, 1);
  const entry = logs[0] as { errorId: string; method: string; path: string; detail: string };
  assert.equal(entry.errorId, 'err-1');
  assert.equal(entry.method, 'GET');
  assert.equal(entry.path, '/boom');
  assert.match(entry.detail, /^Error: つなげません: postgres:\/\/app:\*\*\*@/);
  assert.match(entry.detail, /\n\s+at /, 'stack（どこで起きたか）を残す');
  assert.doesNotMatch(entry.detail, /dev-only-password/);
});

test('開発の 500: detail に（隠した）メッセージも返す。Error でない値でも', async (t) => {
  const { b } = await setup(t, false);
  assert.deepEqual((await b.get('/boom')).json, {
    title: 'サーバの中でエラーが起きました',
    status: 500,
    errorId: 'err-1',
    detail: 'つなげません: postgres://app:***@127.0.0.1:5433/taskapi',
  });
  assert.deepEqual((await b.get('/string')).json, { title: 'サーバの中でエラーが起きました', status: 500, errorId: 'err-1', detail: 'こわれた' });
});

test('4xx の見せてよいエラー（壊れた JSON の 400）は、その status とメッセージ。ログに書かない', async (t) => {
  const { b, logs, port } = await setup(t, true);
  const res = await fetch(`http://127.0.0.1:${port}/json`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"title":',
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(res.status, 400);
  assert.equal(res.headers.get('content-type'), 'application/problem+json; charset=utf-8');
  const body = (await res.json()) as { status: number; title: string };
  assert.equal(body.status, 400);
  assert.equal(typeof body.title, 'string');
  assert.equal(logs.length, 0);
  void b;
});

test('応答を送り始めた後のエラーは、自分で応答しない（Express に任せて接続を閉じる）', async (t) => {
  const { b, logs } = await setup(t, true);
  await assert.rejects(b.get('/half'));
  assert.equal(logs.length, 0);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
