// 追加（第10部）: ユーザー登録・メールの確認・ログイン・人ごとの分離を「外から」確かめるテスト（31〜45）
// サーバを別のプロセスで起動し、HTTP だけで話す。メールはテストの中の偽の SMTP サーバ（fake-smtp.ts）で受け取る
// 使い方: npm test（api.test.ts と一緒に動く）。127.0.0.1:9493 と 9494 を使う
//         API_SERVER=../自分の/src/server.ts npm test   （自分の API を確かめる）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as h from '../support/helpers.ts';
import {
  ORIGIN,
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

const PORT = 9493;
const BASE = `http://127.0.0.1:${PORT}`;

/** JSON を送る fetch。cookie を書かなければ、Cookie を付けない（この中のテストは、だれとして送るかをいつも書く） */
const api = (p: string, o: Partial<Parameters<typeof h.api>[1]> = {}) => h.api(p, { base: BASE, cookie: null, ...o });
const post = (p: string, body: unknown, o: Partial<Parameters<typeof h.api>[1]> = {}) =>
  api(p, { method: 'POST', body, ...o });

let server: Server;
before(async () => {
  server = await startServer(PORT);
});
after(async () => {
  await stopServer(server);
  await h.cleanup();
});

/** タスクを作る（cookie の人として） */
async function create(cookie: string, title: string) {
  const r = await post('/api/tasks', { title }, { cookie });
  assert.equal(r.status, 201, await r.clone().text());
  return r.json();
}

test('31. 登録 → 確認のメールのリンク → ログイン → /me。Cookie は HttpOnly・SameSite=Lax', async () => {
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
  assert.deepEqual(Object.keys(await me.json()).sort(), ['email', 'id']);
  assert.match(me.headers.get('cache-control') ?? '', /no-store/);
});

test('32. ログインしていなければ、タスクも SSE も /me も 401', async () => {
  await problem(await api('/api/tasks'), 401);
  await problem(await post('/api/tasks', { title: 'だれのもの' }), 401);
  await problem(await api('/api/events'), 401);
  await problem(await api('/api/auth/me'), 401);
  // 知らない Cookie でも 401（作り物の ID からセッションを作らない）
  await problem(await api('/api/tasks', { cookie: 'sid=s%3Aunknown.abc' }), 401);
});

test('33. 確認の前は 403。パスワード違いと、無いアドレスは、同じ 401。確認のリンクは1回だけ', async () => {
  const email = newEmail('carol');
  await post('/api/auth/register', { email, password: PASSWORD });
  const mail = await takeMail(email);
  const unverified = await problem(await post('/api/auth/login', { email, password: PASSWORD }), 403);
  assert.equal(unverified.type, 'urn:task-api:email-not-verified');

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

test('34. 登録済みのアドレスで登録しても、同じ 202 と本文。本人にだけ、お知らせのメール', async () => {
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

test('35. パスワードの決まり: 短い・よく使われる・メールアドレスを含むものは 422（pointer は #/password）', async () => {
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

test('36. alice と bob: ほかの人のタスクは、見えない・変えられない・消せない（404）。題名や冪等キーも人ごと', async () => {
  const alice = (await signUp(BASE, newEmail('alice'), { remember: false })).cookie;
  const bob = (await signUp(BASE, newEmail('bob'), { remember: false })).cookie;
  const task = await create(alice, '牛乳を買う');
  await create(bob, '牛乳を買う'); // 同じ題名でも、人が違えば作れる

  await problem(await api(`/api/tasks/${task.id}`, { cookie: bob }), 404);
  await problem(
    await api(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      body: { title: '書き換え' },
      headers: { 'if-match': '"1"' },
      cookie: bob,
    }),
    404,
  );
  await problem(
    await api(`/api/tasks/${task.id}`, { method: 'DELETE', headers: { 'if-match': '"1"' }, cookie: bob }),
    404,
  );
  const bobList = (await (await api('/api/tasks?limit=100', { cookie: bob })).json()).items;
  assert.ok(!bobList.some((t: { id: number }) => t.id === task.id));
  // owner_id のような項目は、送っても使わない（知らない項目は 422）
  await problem(await post('/api/tasks', { title: 'x', ownerId: 1 }, { cookie: bob }), 422);
  // alice のタスクは、そのまま
  const still = await (await api(`/api/tasks/${task.id}`, { cookie: alice })).json();
  assert.equal(still.title, '牛乳を買う');

  // 同じ Idempotency-Key でも、人が違えば別のもの
  const k = { 'idempotency-key': 'same-key-0001' };
  const a = await post('/api/tasks', { title: '同じキー' }, { cookie: alice, headers: k });
  const b = await post('/api/tasks', { title: '同じキー' }, { cookie: bob, headers: k });
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  assert.equal(b.headers.get('idempotent-replayed'), null);
  assert.notEqual((await a.json()).id, (await b.json()).id);
});

test('37. SSE: 自分のタスクのイベントだけが届く', async () => {
  const alice = (await signUp(BASE, newEmail('alice'), { remember: false })).cookie;
  const bob = (await signUp(BASE, newEmail('bob'), { remember: false })).cookie;
  const es = await h.openEvents({ base: BASE, cookie: bob });
  try {
    await es.waitFor((e) => e.retry !== undefined);
    await create(alice, 'alice だけのタスク');
    const mine = await create(bob, 'bob のタスク');
    const got = await es.waitFor((e) => e.event === 'task.created');
    assert.equal(JSON.parse(got.data ?? '').id, mine.id, '先に届くのは、自分のもの（alice のものは届かない）');
    assert.ok(!es.events.some((e) => (e.data ?? '').includes('alice だけのタスク')));
  } finally {
    es.close();
  }
});

test('38. ログインのたびにセッション ID が変わる。ログアウトすると、その Cookie は使えない', async () => {
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

test('39. CSRF: ほかのオリジン・ほかのサイトからの書き換えは 403。読むだけと、自分の画面からは通る', async () => {
  const { email, cookie } = await signUp(BASE, newEmail('hana'), { remember: false });
  await problem(
    await post('/api/tasks', { title: 'よそから' }, { cookie, headers: { origin: 'http://evil.example' } }),
    403,
  );
  await problem(
    await post(
      '/api/tasks',
      { title: 'よそから' },
      { cookie, headers: { origin: 'http://localhost:5173.evil.example' } },
    ),
    403,
  );
  await problem(
    await post('/api/tasks', { title: 'よそから' }, { cookie, headers: { 'sec-fetch-site': 'cross-site' } }),
    403,
  );
  await problem(
    await post('/api/auth/login', { email, password: PASSWORD }, { headers: { origin: 'http://evil.example' } }),
    403,
  );
  assert.equal(
    (await api('/api/tasks', { cookie, headers: { origin: 'http://evil.example' } })).status,
    200,
    'GET は通す（CORS で読めないようにしてある）',
  );
  assert.equal(
    (
      await post(
        '/api/tasks',
        { title: '自分の画面から' },
        { cookie, headers: { origin: ORIGIN, 'sec-fetch-site': 'same-origin' } },
      )
    ).status,
    201,
  );
  const list = (await (await api('/api/tasks?limit=100', { cookie })).json()).items;
  assert.deepEqual(
    list.map((t: { title: string }) => t.title),
    ['自分の画面から'],
  );
});

test('40. パスワードの再設定: 無いアドレスでも同じ 202。リンクは1回だけ。ほかの端末のログインも終わる', async () => {
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

test('41. セキュリティのヘッダ（helmet）。X-Powered-By は出さない', async () => {
  const r = await api('/api/tasks');
  assert.equal(r.headers.get('x-powered-by'), null);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.match(r.headers.get('content-security-policy') ?? '', /default-src 'self'/);
  assert.match(r.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'|frame-ancestors 'self'/);
  assert.ok(r.headers.get('referrer-policy') !== null);
});

test('42. ログイン・登録の回数の上限（IP ごと。429 と Retry-After）。ほかの API は数えない', async () => {
  const s = await startServer(9494, { LOGIN_RATE_LIMIT_PER_MINUTE: '3' });
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

test('43. 設定: OIDC_ は3つそろえる。本番では SESSION_SECRET が必須', async () => {
  const { spawn } = await import('node:child_process');
  const run = (env: Record<string, string>) =>
    new Promise<{ code: number | null; out: string }>((resolve) => {
      const child = spawn(process.execPath, [h.SERVER], {
        env: { ...process.env, PORT: '9494', ...env },
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
    CURSOR_SECRET: 'dev-only-cursor-secret-0000000000000',
    DATABASE_URL: 'postgres://app:x@127.0.0.1:5433/taskapi',
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

test('44. 練習用の IdP でログイン: 新しい人は作られる。state が違えば断る', async () => {
  const port = 9494;
  const base = `http://127.0.0.1:${port}`;
  const idp = await startIdp({
    port: 0,
    clients: [
      { clientId: 'task-app', clientSecret: 'dev-only-client-secret', redirectUris: [`${base}/api/auth/idp/callback`] },
    ],
  });
  const s = await startServer(port, {
    APP_URL: base,
    OIDC_ISSUER: idp.issuer,
    OIDC_CLIENT_ID: 'task-app',
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

test('45. 練習用の IdP: 同じアドレスのユーザーがいても、IdP が確かめていないアドレスなら結びつけない', async () => {
  const port = 9494;
  const base = `http://127.0.0.1:${port}`;
  const idp = await startIdp({
    port: 0,
    clients: [
      { clientId: 'task-app', clientSecret: 'dev-only-client-secret', redirectUris: [`${base}/api/auth/idp/callback`] },
    ],
  });
  const s = await startServer(port, {
    APP_URL: base,
    OIDC_ISSUER: idp.issuer,
    OIDC_CLIENT_ID: 'task-app',
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
