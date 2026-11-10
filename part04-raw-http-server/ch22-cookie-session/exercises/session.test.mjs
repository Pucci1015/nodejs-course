// 練習問題7のテスト
// 使い方: node --test session.test.mjs
//         MODULE=../solutions/session.mjs node --test session.test.mjs   （解答例で確かめる）
// 後半のテストは、127.0.0.1 の空いているポートでサーバを起動して確かめる
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { SessionStore, withSession, newSessionId } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './session.mjs')).href);

const fakeClock = (start = 1_000_000) => {
  const c = { t: start, now: () => c.t };
  return c;
};

test('newSessionId: 43 文字の base64url。毎回違う', () => {
  const ids = new Set(Array.from({ length: 1000 }, newSessionId));
  assert.equal(ids.size, 1000);
  for (const id of ids) assert.match(id, /^[A-Za-z0-9_-]{43}$/);
});

test('SessionStore: create・get・set・destroy', () => {
  const store = new SessionStore();
  const id = store.create({ user: 'alice' });
  assert.deepEqual(store.get(id), { user: 'alice' });
  store.set(id, { user: 'alice', theme: 'dark' });
  assert.deepEqual(store.get(id), { user: 'alice', theme: 'dark' });
  store.destroy(id);
  assert.equal(store.get(id), null);
  assert.equal(store.get('no-such-id'), null);
});

test('SessionStore: 最後に保存してから ttlMs で切れる。切れたら消える', () => {
  const clock = fakeClock();
  const store = new SessionStore({ ttlMs: 1000, now: clock.now });
  const id = store.create({ n: 1 });
  clock.t += 900;
  store.set(id, { n: 2 }); // ここから 1000ms 延びる
  clock.t += 900;
  assert.deepEqual(store.get(id), { n: 2 });
  clock.t += 200;
  assert.equal(store.get(id), null);
  assert.equal(store.size, 0, '切れたものは get のときに消す');
});

test('SessionStore: regenerate は古い ID を消し、新しい ID を返す', () => {
  const store = new SessionStore();
  const old = store.create({ csrf: 'x' });
  const fresh = store.regenerate(old, { user: 'alice' });
  assert.notEqual(fresh, old);
  assert.equal(store.get(old), null);
  assert.deepEqual(store.get(fresh), { user: 'alice' });
});

test('SessionStore: prune は切れたものを全部消し、数を返す', () => {
  const clock = fakeClock();
  const store = new SessionStore({ ttlMs: 1000, now: clock.now });
  store.create();
  store.create();
  clock.t += 500;
  const alive = store.create();
  clock.t += 600;
  assert.equal(store.prune(), 2);
  assert.equal(store.size, 1);
  assert.notEqual(store.get(alive), null);
});

// ---- withSession: 本物のサーバで確かめる
async function serve(handler) {
  const server = http.createServer(handler);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    close: () => new Promise((r) => { server.closeAllConnections(); server.close(r); }),
    get: (p, cookie) => fetch(base + p, { headers: cookie ? { cookie } : {}, signal: AbortSignal.timeout(2000) }),
  };
}
const sidOf = (res) => /^sid=([^;]*)/.exec(res.headers.getSetCookie().find((c) => c.startsWith('sid=')) ?? '')?.[1];

function app(store) {
  return withSession((req, res) => {
    const url = new URL(`http://x${req.url}`);
    if (url.pathname === '/count') req.session.count = (req.session.count ?? 0) + 1;
    if (url.pathname === '/login') {
      req.regenerateSession();
      req.session.user = 'alice';
    }
    if (url.pathname === '/logout') req.destroySession();
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(req.session));
  }, store);
}

test('withSession: 中身を入れたら Cookie を送る。次からは同じセッション', async () => {
  const store = new SessionStore();
  const s = await serve(app(store));
  try {
    const r1 = await s.get('/count');
    const sid = sidOf(r1);
    assert.match(sid ?? '', /^[A-Za-z0-9_-]{43}$/);
    const r2 = await s.get('/count', `sid=${sid}`);
    assert.deepEqual(await r2.json(), { count: 2 });
  } finally {
    await s.close();
  }
});

test('withSession: Cookie の属性は HttpOnly・SameSite=Lax・Path=/・Max-Age。Cache-Control: no-store', async () => {
  const store = new SessionStore({ ttlMs: 60_000 });
  const s = await serve(app(store));
  try {
    const r = await s.get('/count');
    const c = r.headers.getSetCookie().find((x) => x.startsWith('sid='));
    for (const part of ['HttpOnly', 'SameSite=Lax', 'Path=/', 'Max-Age=60']) assert.ok(c.split('; ').includes(part), `${part} が無い: ${c}`);
    assert.equal(r.headers.get('cache-control'), 'no-store');
  } finally {
    await s.close();
  }
});

test('withSession: 中身の無いセッションは作らない（Cookie も送らない）', async () => {
  const store = new SessionStore();
  const s = await serve(app(store));
  try {
    const r = await s.get('/nothing');
    assert.deepEqual(r.headers.getSetCookie(), []);
    assert.equal(store.size, 0);
  } finally {
    await s.close();
  }
});

test('withSession: 知らない ID が送られてきたら、それを使わず新しい ID にする', async () => {
  const store = new SessionStore();
  const s = await serve(app(store));
  try {
    const r = await s.get('/count', 'sid=my-own-made-up-id');
    assert.deepEqual(await r.json(), { count: 1 });
    const sid = sidOf(r);
    assert.ok(sid && sid !== 'my-own-made-up-id', `送った ID がそのまま使われた: ${sid}`);
    assert.equal(store.get('my-own-made-up-id'), null);
  } finally {
    await s.close();
  }
});

test('withSession: regenerateSession で ID が変わり、古い ID は使えない', async () => {
  const store = new SessionStore();
  const s = await serve(app(store));
  try {
    const before = sidOf(await s.get('/count'));
    const r = await s.get('/login', `sid=${before}`);
    const after = sidOf(r);
    assert.ok(after && after !== before, 'ログインで ID が変わっていない');
    assert.deepEqual(await r.json(), { user: 'alice' });
    assert.deepEqual(await (await s.get('/count', `sid=${before}`)).json(), { count: 1 }, '古い ID で、前のセッションが続いている');
  } finally {
    await s.close();
  }
});

test('withSession: destroySession でサーバからも消え、Cookie も消す', async () => {
  const store = new SessionStore();
  const s = await serve(app(store));
  try {
    const sid = sidOf(await s.get('/login'));
    const r = await s.get('/logout', `sid=${sid}`);
    const c = r.headers.getSetCookie().find((x) => x.startsWith('sid='));
    assert.ok(c && c.startsWith('sid=;') && c.includes('Max-Age=0'), `Cookie を消していない: ${c}`);
    assert.equal(store.get(sid), null);
    assert.deepEqual(await (await s.get('/count', `sid=${sid}`)).json(), { count: 1 }, 'ログアウトした ID がまだ使える');
  } finally {
    await s.close();
  }
});
