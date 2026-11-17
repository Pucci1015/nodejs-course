// 練習問題8 のテスト。練習用の IdP（tools/mini-idp.ts）を空いているポートで起動して、ログインの流れを最後まで動かす
// 使い方: node --test client-app.test.ts
//   模範解答を試す: MODULE=../solutions/client-app.ts node --test client-app.test.ts
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startIdp, type IdpClient } from '../../tools/mini-idp.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './client-app.ts');
const { createClientApp, safeReturnTo }: typeof import('./client-app.ts') = await import(pathToFileURL(file).href);

async function setup(t: TestContext) {
  const client: IdpClient = { clientId: 'task-app', clientSecret: 'dev-only-client-secret', redirectUris: [] };
  const idp = await startIdp({ port: 0, clients: [client] });
  t.after(() => idp.close());
  // アプリのポートを先に決める（redirect_uri に入れるため）。空いているポートを1つ借りて、すぐ返す
  const port = await new Promise<number>((resolve) => {
    const probe = net.createServer().listen(0, '127.0.0.1', () => {
      const p = (probe.address() as AddressInfo).port;
      probe.close(() => resolve(p));
    });
  });
  const base = `http://127.0.0.1:${port}`;
  const redirectUri = `${base}/auth/callback`;
  client.redirectUris.push(redirectUri);
  const app = createClientApp({ issuer: idp.issuer, clientId: 'task-app', clientSecret: 'dev-only-client-secret', redirectUri });
  const server = app.listen(port, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());

  /** ブラウザ1つ分。アプリの Cookie だけを覚える。リダイレクトは自分でたどる */
  function browser() {
    let cookie = '';
    async function go(url: string, init: RequestInit = {}) {
      const res = await fetch(url, {
        ...init,
        redirect: 'manual',
        headers: { ...(url.startsWith(base) && cookie !== '' ? { cookie } : {}), ...(init.headers as Record<string, string>) },
        signal: AbortSignal.timeout(5000),
      });
      for (const line of res.headers.getSetCookie()) {
        const pair = line.split(';')[0] ?? '';
        cookie = pair.endsWith('=') ? '' : pair;
      }
      const text = await res.text();
      return { status: res.status, location: res.headers.get('location') ?? '', text };
    }
    /** ログインを始めて、IdP の画面で user を選ぶ（deny なら断る）。アプリに戻った応答を返す */
    async function login(user: string | 'deny', returnTo?: string) {
      const start = await go(`${base}/auth/login${returnTo === undefined ? '' : `?returnTo=${encodeURIComponent(returnTo)}`}`);
      assert.equal(start.status, 302, '/auth/login が IdP へリダイレクトしません');
      const authorize = new URL(start.location);
      assert.equal(`${authorize.origin}${authorize.pathname}`, `${idp.issuer}/authorize`);
      const page = await go(authorize.href);
      assert.equal(page.status, 200, `IdP の画面が出ません: ${page.text}`);
      const form = new URLSearchParams(authorize.search);
      if (user === 'deny') form.set('decision', 'deny');
      else form.set('user', user);
      const back = await go(`${idp.issuer}/authorize`, { method: 'POST', body: form });
      assert.equal(back.status, 302);
      return { callbackUrl: back.location, result: await go(back.location) };
    }
    return { go, login };
  }
  return { base, browser, idp };
}

test('alice でログイン → /api/me。ログアウト → 401', async (t) => {
  const { base, browser } = await setup(t);
  const b = browser();
  assert.equal((await b.go(`${base}/api/me`)).status, 401);
  const { result } = await b.login('u-1001');
  assert.equal(result.status, 303);
  assert.equal(result.location, '/');
  const me = await b.go(`${base}/api/me`);
  assert.equal(me.status, 200);
  assert.deepEqual(JSON.parse(me.text), { sub: 'u-1001', email: 'alice@example.com', name: 'alice' });
  assert.equal((await b.go(`${base}/auth/logout`, { method: 'POST' })).status, 204);
  assert.equal((await b.go(`${base}/api/me`)).status, 401);
});

test('IdP の場所は、/.well-known/openid-configuration から読む', async (t) => {
  const { base, browser, idp } = await setup(t);
  const start = await browser().go(`${base}/auth/login`);
  const url = new URL(start.location);
  assert.equal(url.href.startsWith(`${idp.issuer}/authorize?`), true);
  const q = url.searchParams;
  assert.equal(q.get('response_type'), 'code');
  assert.equal(q.get('code_challenge_method'), 'S256');
  assert.match(q.get('scope') ?? '', /openid/);
  for (const name of ['state', 'nonce', 'code_challenge']) assert.match(q.get(name) ?? '', /^[A-Za-z0-9_-]{43}$/, name);
});

test('returnTo: 自分のサイトのパスなら、ログインの後にそこへ戻る', async (t) => {
  const { base, browser } = await setup(t);
  const b = browser();
  const { result } = await b.login('u-1001', '/tasks?status=todo');
  assert.equal(result.location, '/tasks?status=todo');
  assert.equal((await b.go(`${base}/api/me`)).status, 200);
});

test('returnTo: ほかのサイトへは戻さない（/ にする）', async (t) => {
  const { browser } = await setup(t);
  for (const bad of ['https://other.example/', '//other.example/x', '/\\other.example', 'tasks']) {
    const { result } = await browser().login('u-1001', bad);
    assert.equal(result.location, '/', bad);
  }
  assert.equal(safeReturnTo('/a/b?c=1'), '/a/b?c=1');
  assert.equal(safeReturnTo(undefined), '/');
});

test('断られたら /?login=denied（303）。ログインしていない', async (t) => {
  const { base, browser } = await setup(t);
  const b = browser();
  const { result } = await b.login('deny');
  assert.equal(result.status, 303);
  assert.equal(result.location, '/?login=denied');
  assert.equal((await b.go(`${base}/api/me`)).status, 401);
});

test('戻りの URL を、別のブラウザ（state を覚えていない）で開いても 400', async (t) => {
  const { base, browser, idp } = await setup(t);
  const a = browser();
  const start = await a.go(`${base}/auth/login`);
  const form = new URLSearchParams(new URL(start.location).search);
  form.set('user', 'u-1001');
  const back = await a.go(`${idp.issuer}/authorize`, { method: 'POST', body: form });
  // a ではなく、Cookie を持たない別のブラウザで開く
  const res = await browser().go(back.location);
  assert.equal(res.status, 400);
  // a で開けば、まだ通る（state も code も使われていない）
  assert.equal((await a.go(back.location)).status, 303);
});

test('同じ戻りの URL を2回開いても、2回目は 400（state は1回だけ）', async (t) => {
  const { browser } = await setup(t);
  const b = browser();
  const { callbackUrl, result } = await b.login('u-1001');
  assert.equal(result.status, 303);
  assert.equal((await b.go(callbackUrl)).status, 400);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
