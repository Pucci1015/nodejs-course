// 練習問題7 のテスト
// 使い方: node --test timeout.test.ts
//   模範解答を試す: MODULE=../solutions/timeout.ts node --test timeout.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import session from 'express-session';
import { startApp } from './client.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './timeout.ts');
const { checkTimes, sessionTimeouts }: typeof import('./timeout.ts') = await import(pathToFileURL(file).href);

const limits = { idleMs: 1000, absoluteMs: 5000 };

test('checkTimes: どちらも切れていなければ ok', () => {
  assert.equal(checkTimes({ createdAt: 0, lastSeenAt: 3000 }, 3999, limits), 'ok');
});

test('checkTimes: 最後に使ってから idleMs たてば idle（ちょうども）', () => {
  assert.equal(checkTimes({ createdAt: 0, lastSeenAt: 1000 }, 2000, limits), 'idle');
});

test('checkTimes: ログインしてから absoluteMs たてば absolute（両方切れていても absolute）', () => {
  assert.equal(checkTimes({ createdAt: 0, lastSeenAt: 4900 }, 5000, limits), 'absolute');
  assert.equal(checkTimes({ createdAt: 0, lastSeenAt: 0 }, 9000, limits), 'absolute');
});

function makeApp(now: () => number) {
  const app = express();
  app.use(session({ name: 'sid', secret: 'dev-only-test-secret', resave: false, saveUninitialized: false }));
  app.use(sessionTimeouts({ ...limits, now }));
  // テストのためだけの「ログイン」。ログインした時刻を createdAt と lastSeenAt に入れる
  app.post('/test/login', (req, res) => {
    req.session.userId = 1;
    req.session.createdAt = now();
    req.session.lastSeenAt = now();
    res.status(204).end();
  });
  app.get('/api/me', (req, res) => {
    if (req.session.userId === undefined) {
      res.status(401).json({ detail: 'ログインしてください' });
      return;
    }
    res.json({ id: req.session.userId });
  });
  return app;
}

test('sessionTimeouts: 使い続けていれば idleMs をこえても続く', async (t) => {
  let now = 0;
  const { browser } = await startApp(t, makeApp(() => now));
  const b = browser();
  await b.post('/test/login');
  for (let i = 0; i < 4; i++) {
    now += 900;
    assert.equal((await b.get('/api/me')).status, 200, `${now}ms`);
  }
});

test('sessionTimeouts: idleMs 使わなければ 401 { detail: "もう一度ログインしてください" } で、Cookie を消す', async (t) => {
  let now = 0;
  const { browser } = await startApp(t, makeApp(() => now));
  const b = browser();
  await b.post('/test/login');
  now += 1000;
  const res = await b.get('/api/me');
  assert.equal(res.status, 401);
  assert.deepEqual(res.json, { detail: 'もう一度ログインしてください' });
  assert.ok(res.setCookie.some((line) => line.startsWith('sid=;')), JSON.stringify(res.setCookie));
  assert.deepEqual((await b.get('/api/me')).json, { detail: 'ログインしてください' }, 'セッションが消されていません');
});

test('sessionTimeouts: 使い続けていても absoluteMs で終わる', async (t) => {
  let now = 0;
  const { browser } = await startApp(t, makeApp(() => now));
  const b = browser();
  await b.post('/test/login');
  while (now < 4500) {
    now += 500;
    assert.equal((await b.get('/api/me')).status, 200, `${now}ms`);
  }
  now += 500; // ログインから 5000ms
  assert.equal((await b.get('/api/me')).status, 401);
});

test('sessionTimeouts: ログインしていないセッションには何もしない', async (t) => {
  let now = 0;
  const { browser } = await startApp(t, makeApp(() => now));
  now += 99_999;
  const res = await browser().get('/api/me');
  assert.deepEqual(res.json, { detail: 'ログインしてください' });
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
