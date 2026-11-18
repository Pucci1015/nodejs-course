// 追加（第12部）: 本番で動かすために足したもの（添付ファイル・仕事の列・複数台・監視・本番の設定・画面の配信）を、外から確かめるテスト
// api.test.ts・auth.test.ts と同じく、サーバを別のプロセスで起動し、HTTP だけで話す。
// PostgreSQL（5433）と Redis（6380）が要る（~/dev/part06 で docker compose up -d --wait）。練習用の S3 と偽の SMTP は、テストの中で起動する
// ポートは、空いている番号を OS に選んでもらう（helpers.ts の freePort）
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import * as h from '../support/helpers.ts';
import {
  type Server,
  addJob,
  freePort,
  newEmail,
  noMail,
  problem,
  s3Server,
  sessionCookie,
  signUp,
  startServer,
  stopServer,
  takeMail,
} from '../support/helpers.ts';

/** 1×1 の PNG（中身は本物の画像） */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const METRICS_TOKEN = 'dev-only-metrics-token-0000000000000';

let server: Server;
let base: string;
let alice: string; // alice の Cookie
let bob: string;

before(async () => {
  server = await startServer(await freePort(), {
    ATTACHMENT_MAX_BYTES: '1000', // 小さくして、413 を確かめやすくする
    ATTACHMENTS_PER_TASK: '2',
    SWEEP_GRACE_MINUTES: '0', // 孤児をすぐ消す
    METRICS_TOKEN,
  });
  base = server.base;
  alice = (await signUp(base, newEmail('alice'), { remember: false })).cookie;
  bob = (await signUp(base, newEmail('bob'), { remember: false })).cookie;
});
after(async () => {
  await stopServer(server);
  await h.cleanup();
});

/** cookie の人として送る */
const api = (p: string, cookie: string, o: Partial<Parameters<typeof h.api>[1]> = {}) =>
  h.api(p, { base, cookie, ...o });

async function createTask(cookie: string, title: string, dueDate?: string) {
  const r = await api('/api/tasks', cookie, {
    method: 'POST',
    body: { title, ...(dueDate !== undefined && { dueDate }) },
  });
  assert.equal(r.status, 201, await r.clone().text());
  return r.json();
}

/** 添付ファイルを置く。ボディはバイトのまま */
function upload(
  cookie: string,
  taskId: number,
  body: Buffer,
  name = 'photo.png',
  type = 'image/png',
): Promise<h.TestResponse> {
  return fetch(`${base}/api/tasks/${taskId}/attachments?name=${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: { cookie, origin: h.ORIGIN, 'content-type': type },
    body,
  });
}

/** 練習用の S3 に置かれているキー */
async function storedKeys() {
  return (await s3Server()).keys('task-files');
}

test('46. 添付: PNG を置くと 201。一覧に出る。中身は署名付き URL へ 302 で、その URL から同じバイトが返る', async () => {
  const task = await createTask(alice, '写真を付ける');
  const r = await upload(alice, task.id, PNG, '現場の写真.png');
  assert.equal(r.status, 201, await r.clone().text());
  const a = await r.json();
  assert.match(a.id, /^[0-9a-f-]{36}$/);
  assert.equal(a.fileName, '現場の写真.png');
  assert.equal(a.contentType, 'image/png');
  assert.equal(a.size, PNG.length);
  assert.equal(r.headers.get('location'), `/api/tasks/${task.id}/attachments/${a.id}`);
  // ストレージのキーに、利用者の付けた名前は入らない
  assert.ok((await storedKeys()).some((k) => /^users\/\d+\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.png$/.test(k)));

  const list = await (await api(`/api/tasks/${task.id}/attachments`, alice)).json();
  assert.deepEqual(
    list.items.map((x: { id: string }) => x.id),
    [a.id],
  );

  const content = await fetch(`${base}${a.url}`, { headers: { cookie: alice }, redirect: 'manual' });
  assert.equal(content.status, 302);
  assert.match(content.headers.get('cache-control') ?? '', /no-store/);
  const signed = new URL(content.headers.get('location') ?? '');
  assert.equal(signed.origin, (await s3Server()).url);
  assert.ok(signed.searchParams.has('X-Amz-Signature'));
  const img = await fetch(signed);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png');
  assert.match(img.headers.get('content-disposition') ?? '', /^inline; /);
  assert.deepEqual(Buffer.from(await img.arrayBuffer()), PNG);
  // ?download=1 なら、保存する名前を付ける（UTF-8 の名前は filename* に）
  const dl = await fetch(`${base}${a.url}?download=1`, { headers: { cookie: alice }, redirect: 'manual' });
  const file = await fetch(dl.headers.get('location') ?? '');
  assert.match(file.headers.get('content-disposition') ?? '', /^attachment; .*filename\*=UTF-8''%E7%8F%BE/);
  // 署名を書き換えると、ストレージが断る
  signed.searchParams.set('X-Amz-Signature', '0'.repeat(64));
  assert.equal((await fetch(signed)).status, 403);
});

test('47. 種類は中身で決める: 画像でなければ 415（Content-Type が image/png でも）。空なら 400', async () => {
  const task = await createTask(alice, '画像でないもの');
  await problem(await upload(alice, task.id, Buffer.from('<p>hello</p>'), 'a.png', 'image/png'), 415);
  await problem(await upload(alice, task.id, Buffer.from('%PDF-1.7\n'), 'a.pdf', 'application/pdf'), 415);
  await problem(await upload(alice, task.id, Buffer.alloc(0)), 400);
  const list = await (await api(`/api/tasks/${task.id}/attachments`, alice)).json();
  assert.equal(list.items.length, 0);
});

test('48. 大きすぎれば 413。1つのタスクに付けられる数を超えれば 409', async () => {
  const task = await createTask(alice, '上限');
  await problem(await upload(alice, task.id, Buffer.concat([PNG, Buffer.alloc(1000)])), 413);
  assert.equal((await upload(alice, task.id, PNG)).status, 201);
  assert.equal((await upload(alice, task.id, PNG)).status, 201);
  await problem(await upload(alice, task.id, PNG), 409);
});

test('49. ほかの人のタスクの添付は、一覧・置く・取り出す・消す のどれも 404', async () => {
  const task = await createTask(alice, 'alice だけのもの');
  const a = await (await upload(alice, task.id, PNG)).json();
  await problem(await api(`/api/tasks/${task.id}/attachments`, bob), 404);
  await problem(await upload(bob, task.id, PNG), 404);
  await problem(await api(a.url, bob), 404);
  await problem(await api(`/api/tasks/${task.id}/attachments/${a.id}`, bob, { method: 'DELETE' }), 404);
  // 形の違う ID も 404
  await problem(await api(`/api/tasks/${task.id}/attachments/not-a-uuid/content`, alice), 404);
  // alice のものは、まだある
  assert.equal((await fetch(`${base}${a.url}`, { headers: { cookie: alice }, redirect: 'manual' })).status, 302);
});

test('50. 消すと 204 で、ストレージからも消える。タスクを消した後の孤児は、掃除の仕事が消す', async () => {
  const task = await createTask(alice, '消す');
  const a = await (await upload(alice, task.id, PNG)).json();
  const b = await (await upload(alice, task.id, PNG)).json();
  const before = await storedKeys();
  assert.equal((await api(`/api/tasks/${task.id}/attachments/${a.id}`, alice, { method: 'DELETE' })).status, 204);
  assert.equal((await storedKeys()).length, before.length - 1);
  await problem(await api(a.url, alice), 404);

  // タスクを消すと、添付の行は消えるが、ストレージには残る（孤児）
  const del = await api(`/api/tasks/${task.id}`, alice, { method: 'DELETE', headers: { 'if-match': '"1"' } });
  assert.equal(del.status, 204);
  assert.equal((await storedKeys()).length, before.length - 1);
  await problem(await api(b.url, alice), 404);
  // 掃除の仕事を入れる（ふだんは 1 時間ごと）。ワーカーが消すまで待つ
  await addJob(server, 'sweep-blobs');
  const deadline = Date.now() + 5000;
  while ((await storedKeys()).length !== before.length - 2) {
    assert.ok(Date.now() < deadline, '孤児が消えませんでした');
    await new Promise((r) => setTimeout(r, 50));
  }
});

test('51. 毎朝のお知らせ: 今日が期限のタスクを持つ人に 1 通。2 回動いても 1 通だけ', async () => {
  const { email, cookie } = await signUp(base, newEmail('carol'), { remember: false });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
  await createTask(cookie, '今日まで: 請求書', today);
  await createTask(cookie, '今日まで: 返事', today);
  await createTask(cookie, '期限なし');
  await addJob(server, 'daily-digest', { day: today });
  const mail = await takeMail(email, 5000);
  assert.equal(mail.subject, '今日が期限のタスク（2 件）');
  assert.match(mail.text, /- 今日まで: 請求書\n- 今日まで: 返事\n/);
  assert.doesNotMatch(mail.text, /期限なし/);
  await addJob(server, 'daily-digest', { day: today });
  await noMail(email, 800);
});

test('52. 2台: 台 A で変えたタスクの知らせが、台 B につないでいる客に届く（Redis の Pub/Sub）', async () => {
  const other = await startServer(await freePort(), {}, { schema: server.schema });
  try {
    const es = await h.openEvents({ base: other.base, cookie: alice });
    try {
      await es.waitFor((e) => e.retry !== undefined);
      const task = await createTask(alice, '別の台で作る');
      const created = await es.waitFor((e) => e.event === 'task.created');
      assert.equal(JSON.parse(created.data ?? '').id, task.id);
      // bob の知らせは、alice には届かない
      await createTask(bob, 'bob のもの');
      await new Promise((r) => setTimeout(r, 300));
      assert.ok(!es.events.some((e) => (e.data ?? '').includes('bob のもの')));
    } finally {
      es.close();
    }
    // 台 A の id で台 B につなぎ直すと、送り直せないので reset（台ごとに id の頭が違う）
    const es2 = await h.openEvents({ base, cookie: alice });
    await createTask(alice, 'A の id');
    const fromA = await es2.waitFor((e) => e.event === 'task.created');
    es2.close();
    const es3 = await h.openEvents({ base: other.base, cookie: alice, headers: { 'last-event-id': fromA.id ?? '' } });
    try {
      await es3.waitFor((e) => e.event === 'reset');
    } finally {
      es3.close();
    }
  } finally {
    await stopServer(other);
  }
});

test('53. /metrics: 合言葉が要る。ルートはパスの形で数え、本物の ID を入れない', async () => {
  const task = await createTask(alice, '数える');
  await api(`/api/tasks/${task.id}`, alice);
  const no = await fetch(`${base}/metrics`);
  assert.equal(no.status, 401);
  assert.equal(no.headers.get('www-authenticate'), 'Bearer');
  assert.equal((await fetch(`${base}/metrics`, { headers: { authorization: 'Bearer wrong' } })).status, 401);
  const r = await fetch(`${base}/metrics`, { headers: { authorization: `Bearer ${METRICS_TOKEN}` } });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type') ?? '', /^text\/plain/);
  const text = await r.text();
  assert.match(text, /^http_requests_total\{method="GET",route="\/api\/tasks\/:id",status="200"\} \d+$/m);
  assert.match(text, /^http_request_duration_seconds_bucket\{route="\/api\/tasks\/:id",le="\+Inf"\} \d+$/m);
  assert.match(text, /^jobs_waiting \d+$/m);
  assert.match(text, /^nodejs_eventloop_lag_max_seconds [\d.e-]+$/m);
  assert.doesNotMatch(text, new RegExp(`/api/tasks/${task.id}"`));
});

test('54. /readyz はデータベース・Redis・ストレージを確かめる。/version は版を返す', async () => {
  const r = await fetch(`${base}/readyz`);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), {
    status: 'ready',
    checks: { database: 'ok', redis: 'ok', storage: 'ok' },
  });
  assert.deepEqual(await (await fetch(`${base}/version`)).json(), { version: 'dev' });
  // ストレージのバケットが無い設定では 503（どれが失敗したかの名前だけ）
  const broken = await startServer(await freePort(), { S3_BUCKET: 'no-such-bucket', APP_VERSION: '1.2.3' });
  try {
    const b = await fetch(`${broken.base}/readyz`);
    assert.equal(b.status, 503);
    assert.deepEqual(await b.json(), {
      status: 'not_ready',
      checks: { database: 'ok', redis: 'ok', storage: 'fail' },
    });
    assert.deepEqual(await (await fetch(`${broken.base}/version`)).json(), { version: '1.2.3' });
  } finally {
    await stopServer(broken);
  }
});

/** サーバを起動して、すぐ終わるのを待つ（設定の間違いで止まるはずのとき） */
function runToExit(env: Record<string, string>) {
  return new Promise<{ code: number | null; out: string }>((resolve) => {
    const child = spawn(process.execPath, [h.SERVER], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d: Buffer) => (out += String(d)));
    child.stderr.on('data', (d: Buffer) => (out += String(d)));
    child.once('exit', (code) => resolve({ code, out }));
  });
}

test('55. 本番では REDIS_URL・S3 の鍵・METRICS_TOKEN が必須。足りないものを全部、名前だけ書いて終了コード 1', async () => {
  const r = await runToExit({
    NODE_ENV: 'production',
    PORT: String(await freePort()),
    SESSION_SECRET: 'dev-only-session-secret-0000000000000',
    CURSOR_SECRET: 'dev-only-cursor-secret-0000000000000',
    DATABASE_URL: 'postgres://app:dev-only-password@127.0.0.1:5433/taskapi',
    S3_SECRET_ACCESS_KEY: 'dev-only-secret-value-not-shown',
  });
  assert.equal(r.code, 1);
  for (const name of ['REDIS_URL', 'S3_ACCESS_KEY_ID', 'METRICS_TOKEN']) assert.match(r.out, new RegExp(name));
  assert.doesNotMatch(r.out, /S3_SECRET_ACCESS_KEY/); // 書いたものは、足りないと言わない
  assert.doesNotMatch(r.out, /dev-only-/); // 値は書かない
});

test('56. STATIC_DIR: 画面を配る。index.html は毎回確かめさせ、assets は 1 年。/api の 404 は problem+json', async () => {
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'dist-'));
  try {
    await fs.mkdir(path.join(dist, 'assets'));
    await fs.writeFile(path.join(dist, 'index.html'), '<!doctype html><title>タスク</title><div id="root"></div>\n');
    await fs.writeFile(path.join(dist, 'assets', 'index-AbC123.js'), 'console.log(1);\n');
    const web = await startServer(await freePort(), { STATIC_DIR: dist });
    try {
      const top = await fetch(`${web.base}/`);
      assert.equal(top.status, 200);
      assert.equal(top.headers.get('cache-control'), 'no-cache');
      assert.match(await top.text(), /<div id="root">/);
      // CSP の img-src に、ストレージのオリジンが入る（署名付き URL の画像を表示するため）
      assert.match(
        top.headers.get('content-security-policy') ?? '',
        new RegExp(`img-src 'self' data: ${(await s3Server()).url}`),
      );
      const deep = await fetch(`${web.base}/tasks/12`);
      assert.equal(deep.status, 200);
      assert.match(await deep.text(), /<div id="root">/);
      const js = await fetch(`${web.base}/assets/index-AbC123.js`);
      assert.equal(js.status, 200);
      assert.equal(js.headers.get('cache-control'), 'public, max-age=31536000, immutable');
      assert.equal((await fetch(`${web.base}/assets/index-old999.js`)).status, 404);
      assert.equal((await fetch(`${web.base}/missing.png`)).status, 404);
      const moved = await fetch(`${web.base}/index.html`, { redirect: 'manual' });
      assert.equal(moved.status, 301);
      await problem(await fetch(`${web.base}/api/nothing`), 404);
    } finally {
      await stopServer(web);
    }
  } finally {
    await fs.rm(dist, { recursive: true, force: true });
  }
});

test('57. 本番でプロキシの後ろ: TRUST_PROXY があれば、X-Forwarded-Proto: https で __Host-sid（Secure）が付く', async () => {
  const email = newEmail('dave');
  await signUp(base, email, { remember: false }); // 確認まで済んだ人（同じスキーマ）
  const appUrl = 'https://app.example.com';
  const prodEnv = (trustProxy: string) => ({
    NODE_ENV: 'production',
    LOG_LEVEL: 'silent',
    APP_URL: appUrl,
    TRUST_PROXY: trustProxy,
    CURSOR_SECRET: 'dev-only-cursor-secret-0000000000000',
    S3_ACCESS_KEY_ID: 'dev-only-access-key',
    S3_SECRET_ACCESS_KEY: 'dev-only-secret-key',
    METRICS_TOKEN,
  });
  const login = (b: string) =>
    fetch(`${b}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: appUrl, 'x-forwarded-proto': 'https' },
      body: JSON.stringify({ email, password: h.PASSWORD }),
    });
  for (const [trustProxy, expectCookie] of [
    ['1', true],
    ['0', false],
  ] as const) {
    const prod = await startServer(await freePort(), prodEnv(trustProxy), { schema: server.schema });
    try {
      const r = await login(prod.base);
      assert.equal(r.status, 204);
      const line = r.headers.getSetCookie().find((c) => c.startsWith('__Host-sid=')) ?? '';
      if (expectCookie) {
        assert.match(line, /; Secure/);
        assert.ok(sessionCookie(r, '__Host-sid') !== undefined);
        // HSTS も付く（ブラウザは HTTPS の応答のときだけ覚える）
        assert.match(r.headers.get('strict-transport-security') ?? '', /max-age=31536000/);
      } else {
        // プロキシを信じないと、req.secure が false なので、Secure の Cookie を送らない（ログインできない）
        assert.equal(line, '');
      }
    } finally {
      await stopServer(prod);
    }
  }
});
