// 練習問題8 のテスト。空いているポートで起動して、fetch で確かめる
// 使い方: node --test app.test.ts
//   模範解答を試す: MODULE=../solutions/app.ts node --test app.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './app.ts');
const { createAuthApp }: typeof import('./app.ts') = await import(pathToFileURL(file).href);

async function start(t: test.TestContext) {
  const server = createAuthApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const { port } = server.address() as AddressInfo;
  return async (url: string, body: unknown) => {
    const res = await fetch(`http://127.0.0.1:${port}${url}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text();
    const json: unknown = text === '' ? null : JSON.parse(text);
    return { status: res.status, json };
  };
}

const alice = { email: 'alice@example.com', password: 'neko-to-inu-to-tori' };

test('登録: 201 と { id, email }。メールアドレスはそろえる', async (t) => {
  const post = await start(t);
  const res = await post('/api/register', { email: ' Alice@Example.com', password: alice.password });
  assert.equal(res.status, 201);
  assert.deepEqual(res.json, { id: 1, email: 'alice@example.com' });
});

test('登録: 形が違えば 400、決まりに合わなければ 422、2回目は 409', async (t) => {
  const post = await start(t);
  assert.equal((await post('/api/register', { email: 'alice' , password: alice.password })).status, 400);
  assert.equal((await post('/api/register', { email: alice.email })).status, 400);
  assert.equal((await post('/api/register', { email: alice.email, password: 'short' })).status, 422);
  assert.equal((await post('/api/register', alice)).status, 201);
  assert.equal((await post('/api/register', alice)).status, 409);
});

test('ログイン: 合えば 200、違えば 401。いない人も同じ 401 と同じ文', async (t) => {
  const post = await start(t);
  await post('/api/register', alice);
  const ok = await post('/api/login', { email: 'ALICE@example.com', password: alice.password });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.json, { id: 1, email: 'alice@example.com' });
  const wrong = await post('/api/login', { ...alice, password: 'wrong-password' });
  const nobody = await post('/api/login', { email: 'nobody@example.com', password: 'wrong-password' });
  assert.equal(wrong.status, 401);
  assert.equal(nobody.status, 401);
  assert.deepEqual(wrong.json, nobody.json);
});

test('パスワードの変更: 今のパスワードが合えば 204。古いパスワードではログインできなくなる', async (t) => {
  const post = await start(t);
  await post('/api/register', alice);
  const res = await post('/api/password', { email: alice.email, currentPassword: alice.password, newPassword: 'tori-to-sakana-to-kame' });
  assert.equal(res.status, 204);
  assert.equal((await post('/api/login', alice)).status, 401);
  assert.equal((await post('/api/login', { email: alice.email, password: 'tori-to-sakana-to-kame' })).status, 200);
});

test('パスワードの変更: 今のパスワードが違えば 401、新しいものが決まりに合わない・今と同じなら 422', async (t) => {
  const post = await start(t);
  await post('/api/register', alice);
  const change = (currentPassword: string, newPassword: string) => post('/api/password', { email: alice.email, currentPassword, newPassword });
  assert.equal((await change('wrong-password', 'tori-to-sakana-to-kame')).status, 401);
  assert.equal((await change(alice.password, 'short')).status, 422);
  assert.equal((await change(alice.password, alice.password)).status, 422);
  assert.equal((await post('/api/password', { email: alice.email })).status, 400);
  assert.equal((await post('/api/login', alice)).status, 200, '失敗した変更では、パスワードは変わらない');
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
