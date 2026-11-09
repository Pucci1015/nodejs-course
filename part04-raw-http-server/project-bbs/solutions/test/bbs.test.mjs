// 掲示板を「外から」確かめるテスト。サーバを別のプロセスで起動し、HTTP だけで話す
// 使い方: npm test
//         BBS_SERVER=../自分の/src/server.mjs npm test   （自分の掲示板を確かめる）
// 127.0.0.1:9231 を使う。データは OS の一時フォルダに作り、最後に消す
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const SERVER = path.resolve(import.meta.dirname, process.env.BBS_SERVER ?? '../src/server.mjs');
const PORT = 9231;
const BASE = `http://127.0.0.1:${PORT}`;
let dataDir;
let child;
let log = '';

async function startServer() {
  child = spawn(process.execPath, [SERVER], { env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`${BASE}/`, { signal: AbortSignal.timeout(500) });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error(`サーバが起動しませんでした:\n${log}`);
}

async function stopServer() {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise((r) => child.once('exit', r));
  child.kill('SIGTERM');
  await exited;
}

before(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bbs-test-'));
  await startServer();
});

after(async () => {
  await stopServer();
  await fs.rm(dataDir, { recursive: true, force: true });
});

/** 1人の利用者（1つのブラウザ）。Cookie の sid を覚えておく */
class Browser {
  sid = null;

  async request(method, p, form) {
    const headers = {};
    if (this.sid) headers.cookie = `sid=${this.sid}`;
    let body;
    if (form) {
      headers['content-type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams(form).toString();
    }
    const res = await fetch(BASE + p, { method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(3000) });
    for (const c of res.headers.getSetCookie()) {
      const m = /^sid=([^;]*)/.exec(c);
      if (m) this.sid = /Max-Age=0/i.test(c) ? null : m[1];
    }
    const text = await res.text();
    return { status: res.status, headers: res.headers, text, location: res.headers.get('location') };
  }

  get(p) {
    return this.request('GET', p);
  }

  /** そのページのフォームの CSRF トークン */
  async csrf(p) {
    const r = await this.get(p);
    const m = /name="csrf" value="([^"]+)"/.exec(r.text);
    assert.ok(m, `${p} に CSRF トークンが無い`);
    return m[1];
  }

  /** フォームのページを開いてトークンを取り、POST する */
  async submit(formPage, action, fields) {
    return this.request('POST', action, { csrf: await this.csrf(formPage), ...fields });
  }

  async signup(name, password = 'password-1234') {
    const r = await this.submit('/signup', '/signup', { name, password });
    assert.equal(r.status, 303, `登録できない: ${r.status} ${r.text.slice(0, 200)}`);
    return r;
  }
}

const threadIdOf = (location) => Number(/^\/threads\/(\d+)$/.exec(location ?? '')?.[1]);

test('一覧: 200、charset、セキュリティのヘッダ', async () => {
  const r = await new Browser().get('/');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.match(r.headers.get('content-security-policy') ?? '', /default-src 'self'/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.match(r.text, /<meta charset="utf-8">/);
});

test('一覧を見るだけでは、セッションを作らない', async () => {
  const b = new Browser();
  await b.get('/');
  assert.equal(b.sid, null);
});

test('静的ファイル: /static/style.css', async () => {
  const r = await new Browser().get('/static/style.css');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type') ?? '', /^text\/css/);
  assert.equal((await new Browser().get('/static/../package.json')).status, 404);
});

test('登録: 303 で / へ。ログインした状態になり、名前が表示される', async () => {
  const b = new Browser();
  const before = (await b.get('/signup'), b.sid);
  const r = await b.signup('alice');
  assert.equal(r.location, '/');
  assert.notEqual(b.sid, before, '登録（ログイン）で ID が変わっていない');
  const top = await b.get('/');
  assert.match(top.text, /alice/);
  assert.match(top.text, /ログアウト/);
});

test('登録: 名前・パスワードの間違いと、同じ名前は 422', async () => {
  const b = new Browser();
  await b.signup('bob');
  const c = new Browser();
  assert.equal((await c.submit('/signup', '/signup', { name: 'ab', password: 'password-1234' })).status, 422);
  assert.equal((await c.submit('/signup', '/signup', { name: 'carol', password: 'short' })).status, 422);
  assert.equal((await c.submit('/signup', '/signup', { name: 'carol<>', password: 'password-1234' })).status, 422);
  const dup = await c.submit('/signup', '/signup', { name: 'bob', password: 'password-1234' });
  assert.equal(dup.status, 422);
  assert.match(dup.text, /使われています/);
});

test('CSRF トークンの無い POST は 403', async () => {
  const b = new Browser();
  await b.get('/signup');
  assert.equal((await b.request('POST', '/signup', { name: 'mallory1', password: 'password-1234' })).status, 403);
  assert.equal((await b.request('POST', '/signup', { name: 'mallory1', password: 'password-1234', csrf: 'x' })).status, 403);
});

test('ログイン・ログアウト。失敗の知らせは同じ', async () => {
  const b = new Browser();
  await b.signup('dave');
  const sidBefore = b.sid;
  const out = await b.submit('/', '/logout', {});
  assert.equal(out.status, 303);
  assert.equal(b.sid, null, 'ログアウトで Cookie を消していない');
  const old = new Browser();
  old.sid = sidBefore;
  assert.doesNotMatch((await old.get('/')).text, /ログアウト/, 'ログアウトした ID が、まだ使える');

  const wrong = await b.submit('/login', '/login', { name: 'dave', password: 'wrong-password' });
  assert.equal(wrong.status, 303);
  assert.equal(wrong.location, '/login');
  const msg1 = /<p class="flash">([^<]*)<\/p>/.exec((await b.get('/login')).text)?.[1];
  await b.submit('/login', '/login', { name: 'nobody', password: 'wrong-password' });
  const msg2 = /<p class="flash">([^<]*)<\/p>/.exec((await b.get('/login')).text)?.[1];
  assert.ok(msg1, '失敗の知らせが無い');
  assert.equal(msg1, msg2, '無いユーザーと、パスワードの間違いで、知らせが違う');

  const ok = await b.submit('/login', '/login', { name: 'dave', password: 'password-1234' });
  assert.equal(ok.status, 303);
  assert.equal(ok.location, '/');
  assert.match((await b.get('/')).text, /dave/);
});

test('ログインしていなければ、スレッドを立てるページは /login へ', async () => {
  const r = await new Browser().get('/threads/new');
  assert.equal(r.status, 303);
  assert.equal(r.location, '/login');
});

test('スレッドを立てる・返信する。題名と本文はエスケープされる', async () => {
  const b = new Browser();
  await b.signup('erin');
  const r = await b.submit('/threads/new', '/threads', { title: 'Tom & Jerry の <b>話</b>', body: '1行目\r\n2 < 3 の行' });
  assert.equal(r.status, 303);
  const id = threadIdOf(r.location);
  assert.ok(id > 0, `Location が /threads/数 でない: ${r.location}`);

  const reply = await b.submit(`/threads/${id}`, `/threads/${id}/posts`, { body: '返信です "引用"' });
  assert.equal(reply.status, 303);
  assert.match(reply.location ?? '', new RegExp(`^/threads/${id}#post-\\d+$`));

  const page = await new Browser().get(`/threads/${id}`);
  assert.equal(page.status, 200);
  assert.match(page.text, /Tom &amp; Jerry の &lt;b&gt;話&lt;\/b&gt;/);
  assert.match(page.text, /1行目\n2 &lt; 3 の行/, '改行は \\n にそろえ、< はエスケープする');
  assert.match(page.text, /返信です &quot;引用&quot;/);
  assert.ok(!page.text.includes('<b>話</b>'));
});

test('入力の間違いは 422 で、入力した値を残したフォームを返す', async () => {
  const b = new Browser();
  await b.signup('frank');
  const r = await b.submit('/threads/new', '/threads', { title: '題名だけ', body: '   ' });
  assert.equal(r.status, 422);
  assert.match(r.text, /value="題名だけ"/);
  const long = await b.submit('/threads/new', '/threads', { title: 'あ'.repeat(101), body: '本文' });
  assert.equal(long.status, 422);
});

test('ログインせずに POST すると、書き込めずに /login へ', async () => {
  const b = new Browser();
  const r = await b.submit('/login', '/threads', { title: 'x', body: 'y' });
  assert.equal(r.status, 303);
  assert.equal(r.location, '/login');
});

test('投稿の削除: 自分のものだけ。消した投稿は「削除されました」', async () => {
  const owner = new Browser();
  await owner.signup('grace');
  const id = threadIdOf((await owner.submit('/threads/new', '/threads', { title: '消すテスト', body: '最初の投稿' })).location);
  const postId = Number(/id="post-(\d+)"/.exec((await owner.get(`/threads/${id}`)).text)?.[1]);
  assert.ok(postId > 0);

  const other = new Browser();
  await other.signup('heidi');
  assert.equal((await other.submit(`/threads/${id}`, `/posts/${postId}/delete`, {})).status, 403);

  const r = await owner.submit(`/threads/${id}`, `/posts/${postId}/delete`, {});
  assert.equal(r.status, 303);
  const page = await owner.get(`/threads/${id}`);
  assert.match(page.text, /削除されました/);
  assert.ok(!page.text.includes('最初の投稿'));
});

test('無いスレッドは 404', async () => {
  const b = new Browser();
  assert.equal((await b.get('/threads/99999')).status, 404);
  assert.equal((await b.get('/threads/abc')).status, 404);
  assert.equal((await b.get('/api/threads/99999')).status, 404);
});

test('大きすぎるボディは 413', async () => {
  const b = new Browser();
  await b.signup('ivan');
  const csrf = await b.csrf('/threads/new');
  const r = await b.request('POST', '/threads', { csrf, title: 'x', body: 'あ'.repeat(30_000) });
  assert.equal(r.status, 413);
});

test('JSON の API: 一覧と1件。パスワードのハッシュは出さない', async () => {
  const b = new Browser();
  await b.signup('judy');
  const id = threadIdOf((await b.submit('/threads/new', '/threads', { title: 'API のテスト', body: '本文' })).location);
  const list = JSON.parse((await b.get('/api/threads')).text);
  assert.ok(Array.isArray(list));
  const item = list.find((t) => t.id === id);
  assert.equal(item.title, 'API のテスト');
  assert.equal(item.author, 'judy');
  assert.equal(item.postCount, 1);
  const one = JSON.parse((await b.get(`/api/threads/${id}`)).text);
  assert.equal(one.posts.length, 1);
  assert.equal(one.posts[0].body, '本文');
  assert.ok(!JSON.stringify(list).includes('hash'), 'API にパスワードのハッシュが出ている');
});

test('一覧のページ分け: 20 件ずつ、新しく書き込まれた順', async () => {
  const b = new Browser();
  await b.signup('ken');
  for (let i = 1; i <= 21; i++) await b.submit('/threads/new', '/threads', { title: `ページ分け ${i}`, body: '本文' });
  const p1 = (await b.get('/')).text;
  assert.equal((p1.match(/<a href="\/threads\/\d+">/g) ?? []).length, 20);
  assert.ok(p1.indexOf('ページ分け 21') < p1.indexOf('ページ分け 20'), '新しいものが先');
  assert.match(p1, /href="\/\?page=2"/);
  const p2 = (await b.get('/?page=2')).text;
  assert.ok((p2.match(/<a href="\/threads\/\d+">/g) ?? []).length >= 1);
});

test('データはファイルに残る。サーバを起動し直しても消えない。パスワードはそのまま保存しない', async () => {
  const b = new Browser();
  await b.signup('leo', 'my-secret-password');
  const id = threadIdOf((await b.submit('/threads/new', '/threads', { title: '残るかな', body: '本文' })).location);
  await stopServer();
  const files = await fs.readdir(dataDir);
  const text = (await Promise.all(files.map((f) => fs.readFile(path.join(dataDir, f), 'utf8').catch(() => '')))).join('\n');
  assert.ok(!text.includes('my-secret-password'), 'パスワードがそのままファイルに入っている');
  await startServer();
  const page = await new Browser().get(`/threads/${id}`);
  assert.equal(page.status, 200);
  assert.match(page.text, /残るかな/);
  const again = new Browser();
  assert.equal((await again.submit('/login', '/login', { name: 'leo', password: 'my-secret-password' })).location, '/');
});
