// ユーザー登録・メールの確認・ログインを「外から」確かめるテスト（土台。第10部の成果物のテストから）
// サーバを別のプロセスで起動し、HTTP だけで話す。メールはテストの中の偽の SMTP サーバ（fake-smtp.ts）で受け取る
// 使い方: npm test。ポートは空いているもの（freePort）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as h from '../support/helpers.ts';
import {
  ORIGIN,
  freePort,
  PASSWORD,
  type Server,
  logIn,
  newEmail,
  noMail,
  problem,
  sessionCookie,
  signUp,
  startServer,
  stopServer,
  takeMail,
  tokenIn,
} from '../support/helpers.ts';
import { startIdp } from '../support/mini-idp.ts';

let BASE = '';

/** JSON を送る fetch。cookie を書かなければ、Cookie を付けない（この中のテストは、だれとして送るかをいつも書く） */
const api = (p: string, o: Partial<Parameters<typeof h.api>[1]> = {}) => h.api(p, { base: BASE, cookie: null, ...o });
const post = (p: string, body: unknown, o: Partial<Parameters<typeof h.api>[1]> = {}) =>
  api(p, { method: 'POST', body, ...o });

let server: Server;
before(async () => {
  server = await startServer(await freePort());
  BASE = server.base;
});
after(async () => {
  await stopServer(server);
  await h.cleanup();
});

test('1. 登録 → 確認のメールのリンク → ログイン → /me。Cookie は HttpOnly・SameSite=Lax', async () => {
  const email = newEmail('alice');
  const r = await post('/api/auth/register', { email, password: PASSWORD });
  assert.equal(r.status, 202);
  const mail = await takeMail(email);
  // リンクは画面の URL（APP_URL）。トークンは # の後ろ（サーバのログや Referer に残らない。第53章 4節）
  assert.match(mail.text, new RegExp(`${ORIGIN}/verify-email#token=[A-Za-z0-9_-]{43}`));
  assert.equal((await post('/api/auth/verify-email', { token: tokenIn(mail) })).status, 204);

  const login = await post('/api/auth/login', { email, password: PASSWORD });
  assert.equal(login.status, 204);
  const line = login.headers.getSetCookie().find((c) => c.startsWith('sid=')) ?? '';
  assert.match(line, /HttpOnly/i);
  assert.match(line, /SameSite=Lax/i);
  assert.match(line, /Path=\//i);
  const cookie = sessionCookie(login) ?? '';
  const me = await api('/api/auth/me', { cookie });
  assert.equal(me.status, 200);
  const body = await me.json();
  assert.deepEqual(body, { id: body.id, email, role: 'member' }); // 登録した人は member
  assert.match(me.headers.get('cache-control') ?? '', /no-store/);
});

test('2. ログインしていなければ /me は 401。知らない Cookie でも 401', async () => {
  await problem(await api('/api/auth/me'), 401);
  await problem(await post('/api/auth/logout-all', {}), 401);
  // 作り物の ID からセッションを作らない
  await problem(await api('/api/auth/me', { cookie: 'sid=s%3Aunknown.abc' }), 401);
});

test('3. 確認の前は 403。パスワード違いと、無いアドレスは、同じ 401。確認のリンクは1回だけ', async () => {
  const email = newEmail('carol');
  await post('/api/auth/register', { email, password: PASSWORD });
  const mail = await takeMail(email);
  const unverified = await problem(await post('/api/auth/login', { email, password: PASSWORD }), 403);
  assert.equal(unverified.type, 'urn:room-booking:email-not-verified');

  const wrong = await problem(await post('/api/auth/login', { email, password: 'not-the-password-1' }), 401);
  const nobody = await problem(await post('/api/auth/login', { email: newEmail('nobody'), password: PASSWORD }), 401);
  assert.equal(wrong.detail, nobody.detail, 'どちらが違うかは教えない');
  // 確認の前でも、パスワードが違えば 401（「登録済み・確認待ち」を、パスワードを知らない人に教えない）
  assert.equal((await post('/api/auth/login', { email, password: 'not-the-password-1' })).status, 401);

  const token = tokenIn(mail);
  assert.equal((await post('/api/auth/verify-email', { token })).status, 204);
  await problem(await post('/api/auth/verify-email', { token }), 400);
  await problem(await post('/api/auth/verify-email', { token: 'x'.repeat(43) }), 400);
  assert.equal(
    (await post('/api/auth/login', { email: email.toUpperCase(), password: PASSWORD })).status,
    204,
    '大文字でも同じ人',
  );
});

test('4. 登録済みのアドレスで登録しても、同じ 202 と本文。本人にだけ、お知らせのメール', async () => {
  const { email } = await signUp(BASE, newEmail('dave'), { remember: false });
  const fresh = await post('/api/auth/register', { email: newEmail('erin'), password: PASSWORD });
  const again = await post('/api/auth/register', {
    email: ` ${email.toUpperCase()} `,
    password: 'another-password-22',
  });
  assert.equal(again.status, fresh.status);
  assert.deepEqual(await again.json(), await fresh.json());
  const notice = await takeMail(email);
  assert.doesNotMatch(notice.text, /#token=/, '確認のリンクは送らない');
  assert.match(notice.text, /\/forgot-password/);
  // 前のパスワードのまま（登録で上書きされていない）
  await logIn(BASE, email);
});

test('5. パスワードの決まり: 短い・よく使われる・メールアドレスを含むものは 422（pointer は #/password）', async () => {
  const email = newEmail('frank');
  for (const password of ['short-pw', 'password1234', `${email}-x`]) {
    const body = await problem(await post('/api/auth/register', { email, password }), 422);
    assert.ok(
      body.errors.some((e: { pointer?: string }) => e.pointer === '#/password'),
      JSON.stringify(body),
    );
  }
  await problem(await post('/api/auth/register', { email: 'not-an-email', password: PASSWORD }), 422);
  await problem(await post('/api/auth/register', { email, password: PASSWORD, admin: true }), 422); // 知らない項目
  await noMail(email);
});

test('6. ログインのたびにセッション ID が変わる。ログアウトすると、その Cookie は使えない', async () => {
  const { email, cookie: first } = await signUp(BASE, newEmail('gina'), { remember: false });
  const second = await logIn(BASE, email);
  assert.notEqual(first, second, 'ログインのたびに新しい ID');

  const out = await post('/api/auth/logout', {}, { cookie: second });
  assert.equal(out.status, 204);
  assert.match(out.headers.getSetCookie().join('\n'), /sid=;.*Expires=Thu, 01 Jan 1970/i, 'Cookie を消す');
  await problem(await api('/api/auth/me', { cookie: second }), 401);
  assert.equal((await api('/api/auth/me', { cookie: first })).status, 200, 'ほかの端末のログインは続く');

  // すべての端末からログアウト
  const third = await logIn(BASE, email);
  assert.equal((await post('/api/auth/logout-all', {}, { cookie: third })).status, 204);
  await problem(await api('/api/auth/me', { cookie: first }), 401);
  await problem(await api('/api/auth/me', { cookie: third }), 401);
});

test('7. CSRF: ほかのオリジン・ほかのサイトからの書き換えは 403。読むだけと、自分の画面からは通る', async () => {
  const { email, cookie } = await signUp(BASE, newEmail('hana'), { remember: false });
  // ほかのオリジン・よく似た名前のオリジン・ほかのサイト（Sec-Fetch-Site）からは 403
  const others: Record<string, string>[] = [
    { origin: 'http://evil.example' },
    { origin: `${ORIGIN}.evil.example` },
    { 'sec-fetch-site': 'cross-site' },
  ];
  for (const headers of others) await problem(await post('/api/auth/logout-all', {}, { cookie, headers }), 403);
  await problem(
    await post('/api/auth/login', { email, password: PASSWORD }, { headers: { origin: 'http://evil.example' } }),
    403,
  );
  assert.equal(
    (await api('/api/auth/me', { cookie, headers: { origin: 'http://evil.example' } })).status,
    200,
    'GET は通す（CORS を許していないので、ほかのオリジンの画面は読めない）',
  );
  assert.equal(
    (await post('/api/auth/logout-all', {}, { cookie, headers: { origin: ORIGIN, 'sec-fetch-site': 'same-origin' } }))
      .status,
    204,
  );
});

test('8. パスワードの再設定: 無いアドレスでも同じ 202。リンクは1回だけ。ほかの端末のログインも終わる', async () => {
  const { email, cookie: old } = await signUp(BASE, newEmail('ivan'), { remember: false });
  const nobody = newEmail('nobody');
  const a = await post('/api/auth/forgot-password', { email: nobody });
  const b = await post('/api/auth/forgot-password', { email });
  assert.equal(a.status, 202);
  assert.deepEqual(await a.json(), await b.json());
  await noMail(nobody);
  const mail = await takeMail(email);
  assert.match(mail.text, new RegExp(`${ORIGIN}/reset-password#token=`));
  const token = tokenIn(mail);

  // 決まりに合わないパスワードは 422。トークンは、まだ使える
  await problem(await post('/api/auth/reset-password', { token, password: 'short' }), 422);
  const next = 'new-purple-otter-92';
  assert.equal((await post('/api/auth/reset-password', { token, password: next })).status, 204);
  await problem(await post('/api/auth/reset-password', { token, password: next }), 400);

  await problem(await api('/api/auth/me', { cookie: old }), 401);
  assert.equal((await post('/api/auth/login', { email, password: PASSWORD })).status, 401);
  await logIn(BASE, email, next);
});

test('9. セキュリティのヘッダ（helmet）。X-Powered-By は出さない', async () => {
  const r = await api('/api/auth/me');
  assert.equal(r.headers.get('x-powered-by'), null);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.match(r.headers.get('content-security-policy') ?? '', /default-src 'self'/);
  assert.match(r.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'|frame-ancestors 'self'/);
  assert.ok(r.headers.get('referrer-policy') !== null);
});

test('10. ログイン・登録の回数の上限（IP ごと。429 と Retry-After）。ほかの API は数えない', async () => {
  const s = await startServer(await freePort(), { LOGIN_RATE_LIMIT_PER_MINUTE: '3' });
  const base = s.base;
  try {
    const email = newEmail('judy');
    for (let i = 0; i < 3; i++)
      assert.equal(
        (
          await h.api('/api/auth/login', {
            base,
            method: 'POST',
            body: { email, password: 'wrong-password-123' },
            cookie: null,
          })
        ).status,
        401,
      );
    const r = await h.api('/api/auth/login', {
      base,
      method: 'POST',
      body: { email, password: 'wrong-password-123' },
      cookie: null,
    });
    await problem(r, 429);
    assert.match(r.headers.get('retry-after') ?? '', /^\d+$/);
    assert.equal((await h.api('/healthz', { base, cookie: null })).status, 200);
  } finally {
    await stopServer(s);
  }
});

test('11. 設定: OIDC_ は3つそろえる。本番では SESSION_SECRET が必須', async () => {
  const { spawn } = await import('node:child_process');
  const run = (env: Record<string, string>) =>
    new Promise<{ code: number | null; out: string }>((resolve) => {
      const child = spawn(process.execPath, [h.SERVER], {
        env: { ...process.env, PORT: '0', ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let out = '';
      child.stdout.on('data', (d: Buffer) => (out += String(d)));
      child.stderr.on('data', (d: Buffer) => (out += String(d)));
      child.once('exit', (code) => resolve({ code, out }));
    });
  const a = await run({ NODE_ENV: 'test', OIDC_ISSUER: 'http://127.0.0.1:9640' });
  assert.equal(a.code, 1);
  assert.match(a.out, /OIDC_/);
  const b = await run({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://app:x@127.0.0.1:5434/roombooking',
  });
  assert.equal(b.code, 1);
  assert.match(b.out, /SESSION_SECRET/);
});

/** 練習用の IdP でログインする（ブラウザの代わりに、リダイレクトを1つずつたどる）。最後の Location と Cookie を返す */
async function idpLogin(base: string, sub: string, { tamperState = false } = {}) {
  const start = await fetch(`${base}/api/auth/idp/login`, { redirect: 'manual' });
  assert.equal(start.status, 302);
  const cookie = sessionCookie(start);
  assert.ok(cookie !== undefined, 'state などを覚えるセッションの Cookie');
  const authorize = new URL(start.headers.get('location') ?? '');
  // IdP の画面で「alice としてログイン」を押したのと同じ（画面の hidden の項目 + user）
  const form = new URLSearchParams(authorize.searchParams);
  form.set('user', sub);
  const back = await fetch(`${authorize.origin}/authorize`, { method: 'POST', body: form, redirect: 'manual' });
  assert.equal(back.status, 302);
  const callback = new URL(back.headers.get('location') ?? '');
  if (tamperState) callback.searchParams.set('state', 'x'.repeat(43));
  const done = await fetch(callback, { headers: { cookie }, redirect: 'manual' });
  assert.equal(done.status, 303);
  return { location: done.headers.get('location'), cookie: sessionCookie(done) };
}

test('12. 練習用の IdP でログイン: 新しい人は作られる。state が違えば断る', async () => {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const idp = await startIdp({
    port: 0,
    clients: [
      { clientId: 'room-app', clientSecret: 'dev-only-client-secret', redirectUris: [`${base}/api/auth/idp/callback`] },
    ],
  });
  const s = await startServer(port, {
    APP_URL: base,
    OIDC_ISSUER: idp.issuer,
    OIDC_CLIENT_ID: 'room-app',
    OIDC_CLIENT_SECRET: 'dev-only-client-secret',
  });
  try {
    const first = await idpLogin(base, 'u-1001');
    assert.equal(first.location, '/');
    assert.ok(first.cookie !== undefined);
    const me = await (await h.api('/api/auth/me', { base, cookie: first.cookie })).json();
    assert.equal(me.email, 'alice@example.com');
    // 2回目も同じ人（issuer と sub で探す）
    const again = await idpLogin(base, 'u-1001');
    assert.equal((await (await h.api('/api/auth/me', { base, cookie: again.cookie })).json()).id, me.id);

    const tampered = await idpLogin(base, 'u-1001', { tamperState: true });
    assert.equal(tampered.location, '/login?error=state');
    assert.equal(
      (await h.api('/api/auth/me', { base, cookie: tampered.cookie ?? null })).status,
      401,
      'ログインしていない',
    );
  } finally {
    await stopServer(s);
    await idp.close();
  }
});

test('13. 練習用の IdP: 同じアドレスのユーザーがいても、IdP が確かめていないアドレスなら結びつけない', async () => {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const idp = await startIdp({
    port: 0,
    clients: [
      { clientId: 'room-app', clientSecret: 'dev-only-client-secret', redirectUris: [`${base}/api/auth/idp/callback`] },
    ],
  });
  const s = await startServer(port, {
    APP_URL: base,
    OIDC_ISSUER: idp.issuer,
    OIDC_CLIENT_ID: 'room-app',
    OIDC_CLIENT_SECRET: 'dev-only-client-secret',
  });
  try {
    // パスワードで登録して確認まで済んだ bob@example.com がいる
    await signUp(base, 'bob@example.com', { remember: false });
    // IdP の bob（u-1002）は email_verified が false。結びつけたら、だれでも bob になれてしまう（第54章 6節）
    const r = await idpLogin(base, 'u-1002');
    assert.equal(r.location, '/login?error=conflict');
    assert.equal((await h.api('/api/auth/me', { base, cookie: r.cookie ?? null })).status, 401);
  } finally {
    await stopServer(s);
    await idp.close();
  }
});
