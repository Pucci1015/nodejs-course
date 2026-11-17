// 練習問題8 のテスト
// 使い方: node --test logout-all.test.ts
//   模範解答を試す: MODULE=../solutions/logout-all.ts node --test logout-all.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startApp } from './client.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './logout-all.ts');
const { createApp }: typeof import('./logout-all.ts') = await import(pathToFileURL(file).href);

const alice = { email: 'alice@example.com', password: 'neko-to-inu-to-tori' };
const bob = { email: 'bob@example.com', password: 'inu-to-saru-to-kiji' };

async function setup(t: import('node:test').TestContext) {
  const { browser } = await startApp(t, await createApp());
  return browser;
}

test('ログイン・/api/me・ログアウト（第52章の session-app.ts と同じ動き）', async (t) => {
  const browser = await setup(t);
  const b = browser();
  assert.equal((await b.get('/api/me')).status, 401);
  assert.equal((await b.post('/api/login', { ...alice, password: 'wrong-password' })).status, 401);
  const login = await b.post('/api/login', alice);
  assert.equal(login.status, 200);
  assert.deepEqual(login.json, { id: 1, email: 'alice@example.com' });
  assert.deepEqual((await b.get('/api/me')).json, { id: 1, email: 'alice@example.com' });
  assert.equal((await b.post('/api/logout')).status, 204);
  assert.equal((await b.get('/api/me')).status, 401);
});

test('logout-all: 同じ人のほかの端末のセッションも消える。ほかの人は消えない', async (t) => {
  const browser = await setup(t);
  const pc = browser();
  const phone = browser();
  const bobPc = browser();
  await pc.post('/api/login', alice);
  await phone.post('/api/login', alice);
  await bobPc.post('/api/login', bob);
  assert.equal((await pc.post('/api/logout-all')).status, 204);
  assert.equal((await pc.get('/api/me')).status, 401, '自分のセッション');
  assert.equal((await phone.get('/api/me')).status, 401, 'ほかの端末のセッション');
  assert.equal((await bobPc.get('/api/me')).status, 200, 'bob のセッションは消さない');
});

test('logout-all: ログインしていなければ 401', async (t) => {
  const browser = await setup(t);
  assert.equal((await browser().post('/api/logout-all')).status, 401);
});

test('password: 変えたら、ほかの端末は 401、今の端末は使い続けられる', async (t) => {
  const browser = await setup(t);
  const pc = browser();
  const phone = browser();
  await pc.post('/api/login', alice);
  await phone.post('/api/login', alice);
  const res = await pc.post('/api/password', { currentPassword: alice.password, newPassword: 'tori-to-sakana-to-kame' });
  assert.equal(res.status, 204);
  assert.equal((await pc.get('/api/me')).status, 200, '今の端末');
  assert.equal((await phone.get('/api/me')).status, 401, 'ほかの端末');
  assert.equal((await browser().post('/api/login', alice)).status, 401, '古いパスワード');
  assert.equal((await browser().post('/api/login', { ...alice, password: 'tori-to-sakana-to-kame' })).status, 200, '新しいパスワード');
});

test('password: 今のパスワードが違えば 401、形が違えば 400、ログインしていなければ 401。どれもセッションは消さない', async (t) => {
  const browser = await setup(t);
  const pc = browser();
  const phone = browser();
  await pc.post('/api/login', alice);
  await phone.post('/api/login', alice);
  assert.equal((await pc.post('/api/password', { currentPassword: 'wrong-password', newPassword: 'tori-to-sakana-to-kame' })).status, 401);
  assert.equal((await pc.post('/api/password', { currentPassword: alice.password, newPassword: 'short' })).status, 400);
  assert.equal((await browser().post('/api/password', { currentPassword: alice.password, newPassword: 'tori-to-sakana-to-kame' })).status, 401);
  assert.equal((await phone.get('/api/me')).status, 200);
});

test('ログアウトした後に logout-all を別の端末で呼んでも、失敗しない', async (t) => {
  const browser = await setup(t);
  const pc = browser();
  const phone = browser();
  await pc.post('/api/login', alice);
  await phone.post('/api/login', alice);
  await pc.post('/api/logout');
  assert.equal((await phone.post('/api/logout-all')).status, 204);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
