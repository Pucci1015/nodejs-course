// 練習問題3 のテスト。express-session を使う小さなアプリに requireAuth をつないで確かめる
// 使い方: node --test require-auth.test.ts
//   模範解答を試す: MODULE=../solutions/require-auth.ts node --test require-auth.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import session from 'express-session';
import { startApp } from './client.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './require-auth.ts');
const { requireAuth }: typeof import('./require-auth.ts') = await import(pathToFileURL(file).href);

const alice = { id: 1, email: 'alice@example.com' };

function makeApp(users = new Map([[1, alice]])) {
  const app = express();
  app.use(session({ name: 'sid', secret: 'dev-only-test-secret', resave: false, saveUninitialized: false }));
  // テストのためだけの「ログイン」。本物のアプリでは、パスワードを確かめてから入れる
  app.post('/test/login/:id', (req, res) => {
    req.session.userId = Number(req.params.id);
    res.status(204).end();
  });
  app.get('/api/me', requireAuth((id) => users.get(id)), (_req, res) => {
    res.json(res.locals.user);
  });
  return app;
}

test('ログインしていなければ 401 と { detail: "ログインしてください" }', async (t) => {
  const { browser } = await startApp(t, makeApp());
  const res = await browser().get('/api/me');
  assert.equal(res.status, 401);
  assert.deepEqual(res.json, { detail: 'ログインしてください' });
});

test('ログインしていれば、res.locals.user にユーザーが入る', async (t) => {
  const { browser } = await startApp(t, makeApp());
  const b = browser();
  await b.post('/test/login/1');
  const res = await b.get('/api/me');
  assert.equal(res.status, 200);
  assert.deepEqual(res.json, { id: 1, email: 'alice@example.com' });
});

test('セッションのユーザーが見つからなければ 401 にして、セッションと Cookie を消す', async (t) => {
  const { browser } = await startApp(t, makeApp());
  const b = browser();
  await b.post('/test/login/99');
  const first = await b.get('/api/me');
  assert.equal(first.status, 401);
  assert.deepEqual(first.json, { detail: 'ログインしてください' });
  assert.ok(
    first.setCookie.some((line) => line.startsWith('sid=;')),
    `Cookie を消す Set-Cookie がありません: ${JSON.stringify(first.setCookie)}`,
  );
});

test('消されたセッションの Cookie は、ユーザーが戻っても使えない', async (t) => {
  const users = new Map([[1, alice]]);
  const { browser } = await startApp(t, makeApp(users));
  const b = browser();
  await b.post('/test/login/1');
  const saved = b.cookies().get('sid') ?? '';
  users.delete(1); // alice が消された
  assert.equal((await b.get('/api/me')).status, 401);
  users.set(1, alice); // 同じ id のユーザーがまたできた
  // 消した後も、前の Cookie をわざと送る
  const again = await browser().get('/api/me', { cookie: `sid=${saved}` });
  assert.equal(again.status, 401, 'セッションが消されていません');
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
