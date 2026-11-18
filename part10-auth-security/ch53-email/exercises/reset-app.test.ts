// 練習問題8 のテスト。メールは送らずに、createMemoryMailer の sent に覚えたものを見る
// 使い方: node --test reset-app.test.ts
//   模範解答を試す: MODULE=../solutions/reset-app.ts node --test reset-app.test.ts
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createMemoryMailer } from './mailer.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './reset-app.ts');
const { createResetApp }: typeof import('./reset-app.ts') = await import(pathToFileURL(file).href);

const alice = { email: 'alice@example.com', password: 'neko-to-inu-to-tori' };
const NEW_PASSWORD = 'tori-to-sakana-to-kame';

async function setup(t: TestContext) {
  let now = Date.UTC(2026, 10, 18, 9, 0, 0);
  const { mailer, sent } = createMemoryMailer();
  const app = createResetApp({ mailer, baseUrl: 'http://127.0.0.1:9637', now: () => now });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const { port } = server.address() as AddressInfo;
  async function post(url: string, body: unknown, form = false) {
    const res = await fetch(`http://127.0.0.1:${port}${url}`, {
      method: 'POST',
      headers: { 'content-type': form ? 'application/x-www-form-urlencoded' : 'application/json' },
      body: form ? new URLSearchParams(body as Record<string, string>).toString() : JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text();
    const json: unknown = res.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text;
    return { status: res.status, json };
  }
  /** 最後に送ったメールの本文から、token= の後を取り出す */
  function lastToken(kind: 'verify' | 'reset') {
    const mail = sent.findLast((m) => m.text.includes(`/${kind}?token=`));
    const m = mail === undefined ? null : new RegExp(`/${kind}\\?token=([A-Za-z0-9_-]+)`).exec(mail.text);
    assert.ok(m?.[1], `${kind} のリンクが入ったメールがありません`);
    return m[1];
  }
  /** 登録して、確認まで済ませる */
  async function registerAndVerify() {
    await post('/api/register', alice);
    await post('/verify', { token: lastToken('verify') }, true);
    sent.length = 0;
  }
  const advance = (ms: number) => (now += ms);
  return { post, sent, lastToken, registerAndVerify, advance };
}

test('前半（本文5節と同じ）: 登録 → 確認する前は 403 → 確認したら 200', async (t) => {
  const s = await setup(t);
  assert.equal((await s.post('/api/register', alice)).status, 202);
  assert.equal((await s.post('/api/login', alice)).status, 403);
  await s.post('/verify', { token: s.lastToken('verify') }, true);
  assert.equal((await s.post('/api/login', alice)).status, 200);
});

test('forgot: 登録している人にだけメールを送る。応答はどちらも同じ 202', async (t) => {
  const s = await setup(t);
  await s.registerAndVerify();
  const known = await s.post('/api/password/forgot', { email: ' Alice@Example.com ' });
  const unknown = await s.post('/api/password/forgot', { email: 'nobody@example.com' });
  assert.equal(known.status, 202);
  assert.equal(unknown.status, 202);
  assert.deepEqual(known.json, unknown.json);
  assert.equal(s.sent.length, 1);
  assert.equal(s.sent[0]?.to, 'alice@example.com');
  assert.match(s.sent[0]?.text ?? '', /http:\/\/127\.0\.0\.1:9637\/reset\?token=[A-Za-z0-9_-]{43}/);
});

test('forgot: email が無ければ 400', async (t) => {
  const s = await setup(t);
  assert.equal((await s.post('/api/password/forgot', {})).status, 400);
});

test('reset: 新しいパスワードでログインでき、古いパスワードではできなくなる。リンクは1回だけ', async (t) => {
  const s = await setup(t);
  await s.registerAndVerify();
  await s.post('/api/password/forgot', { email: alice.email });
  const token = s.lastToken('reset');
  assert.equal((await s.post('/api/password/reset', { token, newPassword: NEW_PASSWORD })).status, 204);
  assert.equal((await s.post('/api/login', alice)).status, 401);
  assert.equal((await s.post('/api/login', { ...alice, password: NEW_PASSWORD })).status, 200);
  const again = await s.post('/api/password/reset', { token, newPassword: 'another-password-123' });
  assert.equal(again.status, 400);
  assert.deepEqual(again.json, { detail: 'リンクが正しくないか、期限が切れています' });
});

test('reset: 30分たったリンクは使えない（29分なら使える）', async (t) => {
  const s = await setup(t);
  await s.registerAndVerify();
  await s.post('/api/password/forgot', { email: alice.email });
  const token = s.lastToken('reset');
  s.advance(30 * 60 * 1000);
  assert.equal((await s.post('/api/password/reset', { token, newPassword: NEW_PASSWORD })).status, 400);
  s.advance(60 * 1000);
  await s.post('/api/password/forgot', { email: alice.email });
  const second = s.lastToken('reset');
  s.advance(29 * 60 * 1000);
  assert.equal((await s.post('/api/password/reset', { token: second, newPassword: NEW_PASSWORD })).status, 204);
});

test('reset: 確認のトークンは使えない。形が違えば 400、新しいパスワードが短ければ 400', async (t) => {
  const s = await setup(t);
  await s.post('/api/register', alice);
  const verifyToken = s.lastToken('verify');
  assert.equal((await s.post('/api/password/reset', { token: verifyToken, newPassword: NEW_PASSWORD })).status, 400);
  assert.equal((await s.post('/api/password/reset', { newPassword: NEW_PASSWORD })).status, 400);
  await s.post('/api/password/forgot', { email: alice.email });
  const token = s.lastToken('reset');
  assert.equal((await s.post('/api/password/reset', { token, newPassword: 'short' })).status, 400);
  assert.equal((await s.post('/api/password/reset', { token, newPassword: NEW_PASSWORD })).status, 204, '短いパスワードで失敗しても、リンクは使っていない');
});

test('reset: 確認がまだの人も、再設定したら確認できたことになる', async (t) => {
  const s = await setup(t);
  await s.post('/api/register', alice);
  await s.post('/api/password/forgot', { email: alice.email });
  await s.post('/api/password/reset', { token: s.lastToken('reset'), newPassword: NEW_PASSWORD });
  assert.equal((await s.post('/api/login', { ...alice, password: NEW_PASSWORD })).status, 200);
});

test('forgot: 同じアドレスへは1分に1通まで（応答は同じ 202）', async (t) => {
  const s = await setup(t);
  await s.registerAndVerify();
  assert.equal((await s.post('/api/password/forgot', { email: alice.email })).status, 202);
  s.advance(59 * 1000);
  assert.equal((await s.post('/api/password/forgot', { email: alice.email })).status, 202);
  assert.equal(s.sent.length, 1);
  s.advance(1000);
  await s.post('/api/password/forgot', { email: alice.email });
  assert.equal(s.sent.length, 2);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
