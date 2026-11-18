// 練習問題6 のテスト。本物の fetch の代わりに、決めた応答を返す関数を渡す
// 使い方: node --test exchange.test.ts
//   模範解答を試す: MODULE=../solutions/exchange.ts node --test exchange.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './exchange.ts');
const { exchangeCode, OAuthError }: typeof import('./exchange.ts') = await import(pathToFileURL(file).href);

const params = {
  tokenEndpoint: 'http://127.0.0.1:9640/token',
  clientId: 'task-app',
  clientSecret: 'dev-only-client-secret',
  redirectUri: 'http://127.0.0.1:9647/auth/callback',
  code: 'code-1',
  verifier: 'v'.repeat(43),
};
const good = { access_token: 'at-1', token_type: 'Bearer', expires_in: 3600, id_token: 'a.b.c', scope: 'openid email' };

/** 呼ばれた中身を覚えて、決めた応答を返す fetch の代わり */
function fakeFetch(status: number, body: string, contentType = 'application/json') {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(body, { status, headers: { 'Content-Type': contentType } });
  };
  return { fn, calls };
}

test('送るもの: POST、Basic 認証、フォームの形のボディ（grant_type・code・redirect_uri・code_verifier）', async () => {
  const f = fakeFetch(200, JSON.stringify(good));
  await exchangeCode(params, f.fn);
  assert.equal(f.calls.length, 1);
  const { url, init } = f.calls[0] ?? assert.fail();
  assert.equal(url, params.tokenEndpoint);
  assert.equal(init.method, 'POST');
  const headers = new Headers(init.headers);
  assert.equal(headers.get('authorization'), `Basic ${Buffer.from('task-app:dev-only-client-secret').toString('base64')}`);
  assert.equal(headers.get('content-type'), 'application/x-www-form-urlencoded');
  const form = new URLSearchParams(String(init.body));
  assert.deepEqual(Object.fromEntries(form), {
    grant_type: 'authorization_code',
    code: 'code-1',
    redirect_uri: params.redirectUri,
    code_verifier: params.verifier,
  });
  assert.equal(form.has('client_secret'), false, 'client_secret はボディに入れない（ヘッダで送る）');
});

test('成功: 確かめた中身を返す（token_type は大文字小文字を問わない）', async () => {
  assert.deepEqual(await exchangeCode(params, fakeFetch(200, JSON.stringify(good)).fn), good);
  const lower = { ...good, token_type: 'bearer' };
  assert.deepEqual(await exchangeCode(params, fakeFetch(200, JSON.stringify(lower)).fn), lower);
});

test('IdP のエラー（400 invalid_grant）: OAuthError（status・error・message に説明）', async () => {
  const body = JSON.stringify({ error: 'invalid_grant', error_description: 'コードはもう使われています' });
  await assert.rejects(exchangeCode(params, fakeFetch(400, body).fn), (err) => {
    assert.ok(err instanceof OAuthError);
    assert.equal(err.status, 400);
    assert.equal(err.error, 'invalid_grant');
    assert.match(err.message, /コードはもう使われています/);
    return true;
  });
});

test('エラーの本文が JSON でない（502 の HTML など）: OAuthError の server_error', async () => {
  await assert.rejects(exchangeCode(params, fakeFetch(502, '<h1>Bad Gateway</h1>', 'text/html').fn), (err) => {
    assert.ok(err instanceof OAuthError);
    assert.equal(err.status, 502);
    assert.equal(err.error, 'server_error');
    return true;
  });
});

test('200 でも形が違う（id_token が無い・token_type が Bearer でない・JSON でない）: invalid_response', async () => {
  const { id_token: _i, ...noId } = good;
  for (const body of [JSON.stringify(noId), JSON.stringify({ ...good, token_type: 'mac' }), 'not json']) {
    await assert.rejects(exchangeCode(params, fakeFetch(200, body).fn), (err) => {
      assert.ok(err instanceof OAuthError);
      assert.equal(err.error, 'invalid_response');
      return true;
    }, body);
  }
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
