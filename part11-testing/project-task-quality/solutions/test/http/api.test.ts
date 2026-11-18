// タスク API を「外から」確かめるテスト。サーバを別のプロセスで起動し、HTTP だけで話す（第28章 6節の契約のテストと同じ考え方）
// 第5部の 25 個のテストに、第6部のテスト（26〜30）を足した。1〜25 は、ポートとデータベースの準備のほかは、第5部と同じ
// 変更（第7部）: TypeScript にした。ポートを 9491・9492 にし、サーバを src/server.ts にした。中身のテストは第6部と同じ
// 変更（第10部）: タスクを使えるのはログインしている人だけになったので、最初にユーザーを登録してログインし、その Cookie を付けて送る。
//   サーバの起動などの道具は helpers.ts に移した。ログインそのもののテストは auth.test.ts
// 使い方: npm test
//         API_SERVER=../自分の/src/server.ts npm test   （自分の API を確かめる）
// 127.0.0.1:9491 と 9492 を使う。中の作りが完成例と違っていても、要件（README の2節）を満たしていれば通る
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import * as h from '../support/helpers.ts';
import { ORIGIN, SERVER, type Server, jar, problem, signUp, startServer, stopServer } from '../support/helpers.ts';

const PORT = 9491;
const BASE = `http://127.0.0.1:${PORT}`;
const KEY = 'test-key-0001';

/** JSON を送る fetch（base を書かなければ、1台目のサーバ。Cookie は helpers.ts の jar から付く） */
const api = (p: string, o: Partial<Parameters<typeof h.api>[1]> = {}) => h.api(p, { base: BASE, ...o });
const openEvents = (o: Partial<Parameters<typeof h.openEvents>[0]> = {}) => h.openEvents({ base: BASE, ...o });

let server: Server;
before(async () => {
  server = await startServer(PORT);
  await signUp(BASE); // 追加（第10部）: 登録 → メールの確認 → ログイン。以降の api() には、この人の Cookie が付く
});
after(async () => {
  await stopServer(server);
  await h.cleanup();
});

async function create(title: string, extra: Record<string, unknown> = {}) {
  const r = await api('/api/tasks', { method: 'POST', body: { title, ...extra } });
  assert.equal(r.status, 201, `作れませんでした: ${await r.clone().text()}`);
  return { task: await r.json(), etag: r.headers.get('etag') ?? '' };
}

test('1. ヘルスチェック', async () => {
  assert.deepEqual(await (await api('/healthz')).json(), { status: 'ok' });
  const r = await api('/readyz');
  assert.equal(r.status, 200);
});

test('2. 最初は空の一覧', async () => {
  const r = await api('/api/tasks');
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { items: [], nextCursor: null });
});

test('3. 作ると 201・Location・ETag。前後の空白は取る', async () => {
  const r = await api('/api/tasks', { method: 'POST', body: { title: '  牛乳を買う  ', dueDate: '2099-12-31' } });
  assert.equal(r.status, 201);
  const t = await r.json();
  assert.equal(r.headers.get('location'), `/api/tasks/${t.id}`);
  assert.equal(r.headers.get('etag'), '"1"');
  assert.ok(Number.isInteger(t.id) && t.id > 0);
  assert.equal(t.title, '牛乳を買う');
  assert.equal(t.status, 'todo');
  assert.equal(t.dueDate, '2099-12-31');
  assert.equal(t.completedAt, null);
  assert.equal(t.version, 1);
  assert.ok(!Number.isNaN(Date.parse(t.createdAt)) && t.createdAt === t.updatedAt);
});

test('4. JSON でない 415、壊れた JSON 400、大きすぎる 413', async () => {
  await problem(
    await api('/api/tasks', {
      method: 'POST',
      body: 'title=a',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
    415,
  );
  await problem(await api('/api/tasks', { method: 'POST', body: '{"title":' }), 400);
  await problem(await api('/api/tasks', { method: 'POST', body: { title: 'x'.repeat(20_000) } }), 413);
});

test('5. 中身の間違いは 422 と errors（pointer）', async () => {
  const a = await problem(await api('/api/tasks', { method: 'POST', body: { title: '   ' } }), 422);
  assert.ok(
    a.errors.some((e: { pointer: string }) => e.pointer === '#/title'),
    JSON.stringify(a),
  );
  const b = await problem(
    await api('/api/tasks', { method: 'POST', body: { title: 'a', dueDate: '2000-01-01' } }),
    422,
  );
  assert.ok(
    b.errors.some((e: { pointer: string }) => e.pointer === '#/dueDate'),
    JSON.stringify(b),
  );
  const c = await problem(
    await api('/api/tasks', { method: 'POST', body: { title: 'a', dueDate: '2099/01/01' } }),
    422,
  );
  assert.ok(
    c.errors.some((e: { pointer: string }) => e.pointer === '#/dueDate'),
    JSON.stringify(c),
  );
  await problem(await api('/api/tasks', { method: 'POST', body: { title: 'a', status: 'done' } }), 422); // 知らない項目
  await problem(await api('/api/tasks', { method: 'POST', body: [{ title: 'a' }] }), 422);
  // 間違いのものは、作られていない
  const list = await (await api('/api/tasks?limit=100')).json();
  assert.ok(!list.items.some((t: { title: string }) => t.title === 'a'));
});

test('6. 終わっていないタスクと同じ題名は 409', async () => {
  await create('同じ題名');
  await problem(await api('/api/tasks', { method: 'POST', body: { title: ' 同じ題名 ' } }), 409);
});

test('7. 1件を見る。無い id・形の違う id は 404', async () => {
  const { task } = await create('1件を見る');
  const r = await api(`/api/tasks/${task.id}`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('etag'), '"1"');
  assert.deepEqual(await r.json(), task);
  for (const id of ['999999', 'abc', '0', '01', '1.5', '-1']) await problem(await api(`/api/tasks/${id}`), 404);
});

test('8. If-None-Match が同じなら 304（本文なし）', async () => {
  const { task, etag } = await create('304 を返す');
  const r = await api(`/api/tasks/${task.id}`, { headers: { 'if-none-match': etag } });
  assert.equal(r.status, 304);
  assert.equal(await r.text(), '');
  assert.equal((await api(`/api/tasks/${task.id}`, { headers: { 'if-none-match': '"999"' } })).status, 200);
});

test('9. PATCH は If-Match が要る（無ければ 428、違えば 412）', async () => {
  const { task } = await create('版を確かめる');
  const url = `/api/tasks/${task.id}`;
  await problem(await api(url, { method: 'PATCH', body: { title: '変えた' } }), 428);
  await problem(await api(url, { method: 'PATCH', body: { title: '変えた' }, headers: { 'if-match': '"2"' } }), 412);
  await problem(await api(url, { method: 'PATCH', body: { title: '変えた' }, headers: { 'if-match': 'W/"1"' } }), 412); // 弱い ETag は If-Match にあてはまらない
  const r = await api(url, { method: 'PATCH', body: { title: '変えた' }, headers: { 'if-match': '"1"' } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('etag'), '"2"');
  const t = await r.json();
  assert.equal(t.title, '変えた');
  assert.equal(t.version, 2);
  // 古い版で送った2人目は 412
  await problem(await api(url, { method: 'PATCH', body: { title: '2人目' }, headers: { 'if-match': '"1"' } }), 412);
  // 形の間違いは 422、JSON でなければ 415
  await problem(await api(url, { method: 'PATCH', body: { done: true }, headers: { 'if-match': '"2"' } }), 422);
  await problem(await api(url, { method: 'PATCH', body: { status: 'later' }, headers: { 'if-match': '"2"' } }), 422);
  await problem(
    await api(url, { method: 'PATCH', body: 'x', headers: { 'if-match': '"2"', 'content-type': 'text/plain' } }),
    415,
  );
  await problem(await api('/api/tasks/999999', { method: 'PATCH', body: {}, headers: { 'if-match': '"1"' } }), 404);
});

test('10. done にすると completedAt。終わったタスクの題名は変えられない（409）', async () => {
  const { task } = await create('終わらせる');
  const url = `/api/tasks/${task.id}`;
  let r = await api(url, { method: 'PATCH', body: { status: 'done' }, headers: { 'if-match': '"1"' } });
  const done = await r.json();
  assert.equal(done.status, 'done');
  assert.ok(!Number.isNaN(Date.parse(done.completedAt)));
  await problem(await api(url, { method: 'PATCH', body: { title: '別の題名' }, headers: { 'if-match': '"2"' } }), 409);
  r = await api(url, { method: 'PATCH', body: { status: 'todo' }, headers: { 'if-match': '"2"' } });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).completedAt, null);
  // 終わったタスクと同じ題名なら、作れる
  const d = await create('終わったものと同じ題名');
  await api(`/api/tasks/${d.task.id}`, { method: 'PATCH', body: { status: 'done' }, headers: { 'if-match': d.etag } });
  await create('終わったものと同じ題名');
});

test('11. 作業中（doing）は 3 個まで（409）', async () => {
  const ids: number[] = [];
  for (let i = 1; i <= 4; i++) ids.push((await create(`作業 ${i}`)).task.id);
  for (const id of ids.slice(0, 3)) {
    assert.equal(
      (await api(`/api/tasks/${id}`, { method: 'PATCH', body: { status: 'doing' }, headers: { 'if-match': '"1"' } }))
        .status,
      200,
    );
  }
  await problem(
    await api(`/api/tasks/${ids[3]}`, { method: 'PATCH', body: { status: 'doing' }, headers: { 'if-match': '"1"' } }),
    409,
  );
  // 1つ終わらせれば、入れられる
  await api(`/api/tasks/${ids[0]}`, { method: 'PATCH', body: { status: 'done' }, headers: { 'if-match': '"2"' } });
  assert.equal(
    (await api(`/api/tasks/${ids[3]}`, { method: 'PATCH', body: { status: 'doing' }, headers: { 'if-match': '"1"' } }))
      .status,
    200,
  );
});

test('12. DELETE も If-Match が要る。消すと 204、その後は 404', async () => {
  const { task } = await create('消す');
  const url = `/api/tasks/${task.id}`;
  await problem(await api(url, { method: 'DELETE' }), 428);
  await problem(await api(url, { method: 'DELETE', headers: { 'if-match': '"5"' } }), 412);
  const r = await api(url, { method: 'DELETE', headers: { 'if-match': '"1"' } });
  assert.equal(r.status, 204);
  assert.equal(await r.text(), '');
  await problem(await api(url), 404);
  await problem(await api(url, { method: 'DELETE', headers: { 'if-match': '"1"' } }), 404);
});

test('13. パスはあるがメソッドが違えば 405 と Allow。パスも無ければ 404', async () => {
  const one = await problem(await api('/api/tasks/1', { method: 'PUT', body: {} }), 405);
  assert.ok(one);
  const r1 = await api('/api/tasks/1', { method: 'PUT', body: {} });
  assert.deepEqual((r1.headers.get('allow') ?? '').split(/,\s*/).sort(), ['DELETE', 'GET', 'HEAD', 'PATCH']);
  const r2 = await api('/api/tasks', { method: 'DELETE' });
  assert.equal(r2.status, 405);
  assert.deepEqual((r2.headers.get('allow') ?? '').split(/,\s*/).sort(), ['GET', 'HEAD', 'POST']);
  await problem(await api('/api/nothing'), 404);
  await problem(await api('/'), 404);
});

test('14. 一覧のクエリの間違いは 400 と errors（parameter）', async () => {
  for (const q of [
    'status=later',
    'page=2',
    'limit=%2020',
    'limit=0',
    'limit=101',
    'limit=2e1',
    'limit=1&limit=2',
    'sort=password',
    'due_before=2026-13-01',
    'cursor=abc',
  ]) {
    const b = await problem(await api(`/api/tasks?${q}`), 400);
    assert.ok(
      Array.isArray(b.errors) &&
        b.errors.length > 0 &&
        b.errors.every((e: { parameter: unknown }) => typeof e.parameter === 'string'),
      `${q}: ${JSON.stringify(b)}`,
    );
  }
});

/** 一覧の1ページ（このテストで使う項目だけ） */
type PageBody = { items: { id: number }[]; nextCursor: string | null };

test('15. カーソルで、重なりも抜けもなく、最後まで読める', async () => {
  for (let i = 0; i < 5; i++) await create(`ページ ${i}`);
  const all = (await (await api('/api/tasks?limit=100&sort=createdAt')).json()).items;
  assert.ok(all.length >= 7);
  const seen: number[] = [];
  let cursor: string | null = null;
  let pages = 0;
  do {
    const params: Record<string, string> = { limit: '2', sort: 'createdAt' };
    if (cursor !== null) params.cursor = cursor;
    const page: PageBody = await (await api(`/api/tasks?${new URLSearchParams(params).toString()}`)).json();
    assert.ok(page.items.length > 0 && page.items.length <= 2);
    seen.push(...page.items.map((t: { id: number }) => t.id));
    cursor = page.nextCursor;
    pages++;
  } while (cursor && pages < 100);
  assert.deepEqual(
    seen,
    all.map((t: { id: number }) => t.id),
  );
  // 作り変えたカーソル・別の並べ方のカーソルは 400
  const first = await (await api('/api/tasks?limit=2&sort=createdAt')).json();
  const broken = `${first.nextCursor.slice(0, -2)}${first.nextCursor.endsWith('AA') ? 'BB' : 'AA'}`;
  await problem(await api(`/api/tasks?limit=2&sort=createdAt&cursor=${encodeURIComponent(broken)}`), 400);
  await problem(await api(`/api/tasks?limit=2&sort=title&cursor=${encodeURIComponent(first.nextCursor)}`), 400);
});

test('16. 絞り込み（status・due_before）と並べ替え（締め切りの無いものは後ろ）', async () => {
  await create('締め切り早い', { dueDate: '2098-01-01' });
  await create('締め切り遅い', { dueDate: '2098-06-01' });
  const due = (await (await api('/api/tasks?due_before=2098-03-01&limit=100')).json()).items;
  assert.deepEqual(
    due.map((t: { title: string }) => t.title),
    ['締め切り早い'],
  );
  const byDue = (await (await api('/api/tasks?sort=dueDate&limit=100')).json()).items;
  const firstNull = byDue.findIndex((t: { dueDate: string | null }) => t.dueDate === null);
  assert.ok(
    firstNull > 0 && byDue.slice(firstNull).every((t: { dueDate: string | null }) => t.dueDate === null),
    '締め切りの無いものは、ある物の後ろ',
  );
  assert.equal(byDue[0].title, '締め切り早い');
  // 締め切りで並べても、カーソルで最後まで読める（null を含む並べ方が1通りに決まっていないと、重なりや抜けが出る）
  const walked: number[] = [];
  let cursor: string | null = null;
  do {
    const params: Record<string, string> = { sort: '-dueDate', limit: '3' };
    if (cursor !== null) params.cursor = cursor;
    const page: PageBody = await (await api(`/api/tasks?${new URLSearchParams(params).toString()}`)).json();
    walked.push(...page.items.map((t: { id: number }) => t.id));
    cursor = page.nextCursor;
  } while (cursor && walked.length < 1000);
  const allDesc = (await (await api('/api/tasks?sort=-dueDate&limit=100')).json()).items.map(
    (t: { id: number }) => t.id,
  );
  assert.deepEqual(walked, allDesc);
  assert.deepEqual(
    [...walked].sort((a, b) => a - b),
    byDue.map((t: { id: number }) => t.id).sort((a: number, b: number) => a - b),
  );
  const doing = (await (await api('/api/tasks?status=doing&limit=100')).json()).items;
  assert.ok(doing.length > 0 && doing.every((t: { status: string }) => t.status === 'doing'));
  const two = (await (await api('/api/tasks?status=doing,done&limit=100')).json()).items;
  assert.ok(
    two.some((t: { status: string }) => t.status === 'done') &&
      two.every((t: { status: string }) => t.status !== 'todo'),
  );
  const byTitle: string[] = (await (await api('/api/tasks?sort=-title&limit=100')).json()).items.map(
    (t: { title: string }) => t.title,
  );
  assert.deepEqual(byTitle, [...byTitle].sort().reverse());
});

test('17. Idempotency-Key: 同じキーで送り直しても、1つしかできない', async () => {
  const send = (body: unknown, key = KEY) =>
    api('/api/tasks', { method: 'POST', body, headers: { 'idempotency-key': key } });
  const r1 = await send({ title: '二重にしない' });
  assert.equal(r1.status, 201);
  const t1 = await r1.json();
  const r2 = await send({ title: '二重にしない' });
  assert.equal(r2.status, 201);
  assert.equal(r2.headers.get('idempotent-replayed'), 'true');
  assert.equal(r2.headers.get('location'), r1.headers.get('location'));
  assert.deepEqual(await r2.json(), t1);
  const list = (await (await api('/api/tasks?limit=100')).json()).items;
  assert.equal(list.filter((t: { title: string }) => t.title === '二重にしない').length, 1);
  // 同じキーで別の中身は 422。キーの形が違えば 400
  await problem(await send({ title: '別の中身' }), 422);
  await problem(await send({ title: 'x' }, 'short'), 400);
  // 間違い（422）は覚えない。直して、同じキーで送り直せる
  await problem(await send({ title: '' }, 'test-key-0002'), 422);
  assert.equal((await send({ title: '直して送り直す' }, 'test-key-0002')).status, 201);
});

test('18. SSE: 作る・変える・消すと、タスクの JSON がイベントで届く', async () => {
  const es = await openEvents();
  try {
    assert.equal(es.res.status, 200);
    assert.match(es.res.headers.get('content-type') ?? '', /^text\/event-stream/);
    await es.waitFor((e) => e.retry !== undefined);
    const { task } = await create('イベントで知らせる');
    const created = await es.waitFor((e) => e.event === 'task.created');
    assert.deepEqual(JSON.parse(created.data ?? ''), task);
    assert.match(created.id ?? '', /^\d+$/);
    await api(`/api/tasks/${task.id}`, { method: 'PATCH', body: { status: 'done' }, headers: { 'if-match': '"1"' } });
    const updated = await es.waitFor((e) => e.event === 'task.updated');
    assert.equal(JSON.parse(updated.data ?? '').status, 'done');
    assert.ok(Number(updated.id) > Number(created.id));
    await api(`/api/tasks/${task.id}`, { method: 'DELETE', headers: { 'if-match': '"2"' } });
    const deleted = await es.waitFor((e) => e.event === 'task.deleted');
    assert.equal(JSON.parse(deleted.data ?? '').id, task.id);
  } finally {
    es.close();
  }
});

test('19. SSE: Last-Event-ID で、切れていた間のものが届く。送り直せなければ reset', async () => {
  const first = await openEvents();
  await create('切れる前');
  const before = await first.waitFor((e) => e.event === 'task.created');
  first.close();
  const { task } = await create('切れている間');
  const again = await openEvents({ headers: { 'last-event-id': before.id ?? '' } });
  try {
    const missed = await again.waitFor((e) => e.event === 'task.created');
    assert.equal(JSON.parse(missed.data ?? '').id, task.id);
  } finally {
    again.close();
  }
  for (const id of ['999999', 'abc']) {
    const es = await openEvents({ headers: { 'last-event-id': id } });
    try {
      await es.waitFor((e) => e.event === 'reset');
    } finally {
      es.close();
    }
  }
  // EventSource は最初の接続でヘッダを付けられないので、?lastEventId= でも受け付ける
  const viaQuery = await fetch(`${BASE}/api/events?lastEventId=abc`, {
    headers: { cookie: jar.get(BASE) ?? '' },
    signal: AbortSignal.timeout(1000),
  }).then(async (r) => {
    if (r.body === null) throw new Error('ボディがありません');
    const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
    let s = '';
    while (!s.includes('event: reset')) s += (await reader.read()).value ?? '';
    await reader.cancel();
    return s;
  });
  assert.match(viaQuery, /event: reset/);
});

test('20. SSE: 心拍（コメント）が届く', async () => {
  const es = await openEvents();
  try {
    await es.waitFor((e) => e.comment !== undefined, 1500); // テストでは SSE_HEARTBEAT_MS=200
  } finally {
    es.close();
  }
});

test('21. CORS: 決めたオリジンだけに許し、ETag などを読めるようにする', async () => {
  const r = await api('/api/tasks', { headers: { origin: ORIGIN } });
  assert.equal(r.headers.get('access-control-allow-origin'), ORIGIN);
  const exposed = (r.headers.get('access-control-expose-headers') ?? '').toLowerCase();
  for (const h of ['etag', 'location']) assert.ok(exposed.includes(h), exposed);
  const pre = await api('/api/tasks/1', {
    method: 'OPTIONS',
    headers: {
      origin: ORIGIN,
      'access-control-request-method': 'PATCH',
      'access-control-request-headers': 'content-type, if-match',
    },
  });
  assert.ok(pre.status === 204 || pre.status === 200);
  assert.match(pre.headers.get('access-control-allow-methods') ?? '', /PATCH/);
  assert.match((pre.headers.get('access-control-allow-headers') ?? '').toLowerCase(), /if-match/);
  const evil = await api('/api/tasks', { headers: { origin: 'http://localhost:5173.evil.example' } });
  assert.equal(evil.headers.get('access-control-allow-origin'), null);
});

test('22. X-Request-Id と X-Content-Type-Options', async () => {
  const r = await api('/api/tasks', { headers: { 'x-request-id': 'req-abc.123' } });
  assert.equal(r.headers.get('x-request-id'), 'req-abc.123');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  const bad = await api('/api/tasks', { headers: { 'x-request-id': 'a b<script>' } });
  assert.notEqual(bad.headers.get('x-request-id'), 'a b<script>');
  assert.match(bad.headers.get('x-request-id') ?? '', /^[A-Za-z0-9._-]{1,64}$/);
});

test('23. 書き換えの回数の上限（429 と Retry-After）。読むだけのものは数えない', async () => {
  const base = 'http://127.0.0.1:9492';
  const s = await startServer(9492, { RATE_LIMIT_PER_MINUTE: '2' });
  try {
    await signUp(base); // 変更（第10部）: 新しいスキーマなので、ここでも登録してログイン（/api/auth は、別の上限で数える）
    for (let i = 0; i < 5; i++) assert.equal((await api('/api/tasks', { base })).status, 200);
    assert.equal((await api('/api/tasks', { base, method: 'POST', body: { title: '1' } })).status, 201);
    assert.equal((await api('/api/tasks', { base, method: 'POST', body: { title: '2' } })).status, 201);
    const r = await api('/api/tasks', { base, method: 'POST', body: { title: '3' } });
    await problem(r, 429);
    assert.match(r.headers.get('retry-after') ?? '', /^\d+$/);
  } finally {
    await stopServer(s);
  }
});

test('24. SIGTERM: SSE に shutdown を送って閉じ、すぐに終了コード 0 で止まる', async () => {
  const base = 'http://127.0.0.1:9492';
  const s = await startServer(9492);
  await signUp(base); // 変更（第10部）
  const es = await openEvents({ base });
  await es.waitFor((e) => e.retry !== undefined);
  const t0 = Date.now();
  s.kill('SIGTERM');
  await es.waitFor((e) => e.event === 'shutdown', 3000);
  await es.done; // 応答が終わる
  const code = await s.exited;
  assert.equal(code, 0, s.log);
  assert.ok(
    Date.now() - t0 < 3000,
    `止まるまで ${Date.now() - t0}ms かかった（SSE を閉じずに、時間切れを待っていないか）`,
  );
});

test('25. 設定が正しくなければ、終了コード 1。値はログに書かない', async () => {
  const secret = 'dev-only-too-short';
  const child = spawn(process.execPath, [SERVER], {
    env: { ...process.env, NODE_ENV: 'test', PORT: '70000', CURSOR_SECRET: secret },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (d: Buffer) => (out += String(d)));
  child.stderr.on('data', (d: Buffer) => (out += String(d)));
  const code = await new Promise<number | null>((r) => child.once('exit', r));
  assert.equal(code, 1);
  assert.match(out, /PORT/);
  assert.match(out, /CURSOR_SECRET/);
  assert.ok(!out.includes(secret), out);
});

// ここから下は、第6部で足したテスト（データベースに置いたから、できるようになったこと）

test('26. 同じ版を見て、3つの PATCH が同時に来たら、1つだけが通り、ほかは 412', async () => {
  const { task, etag } = await create('同時に変える');
  const patch = (title: string) =>
    api(`/api/tasks/${task.id}`, { method: 'PATCH', body: { title }, headers: { 'if-match': etag } });
  const results = await Promise.all([patch('同時に変える A'), patch('同時に変える B'), patch('同時に変える C')]);
  const statuses = results.map((r) => r.status).sort();
  assert.deepEqual(statuses, [200, 412, 412]);
  const now = await (await api(`/api/tasks/${task.id}`)).json();
  assert.equal(now.version, 2, '版は1つだけ上がる');
});

test('27. 同じ題名の POST が同時に来ても、できるのは1つ（ほかは 409）', async () => {
  const post = () => api('/api/tasks', { method: 'POST', body: { title: '同時に作る' } });
  const results = await Promise.all(Array.from({ length: 5 }, post));
  const statuses = results.map((r) => r.status).sort();
  assert.deepEqual(statuses, [201, 409, 409, 409, 409]);
  for (const r of results) if (r.status === 409) await problem(r, 409);
});

test('28. サーバを止めて起動し直しても、タスクも冪等キーも残っている', async () => {
  const base = 'http://127.0.0.1:9492';
  const s1 = await startServer(9492);
  let s2: Server | undefined;
  try {
    await signUp(base); // 変更（第10部）: セッションもデータベースにあるので、起動し直してもログインが続く
    const send = () =>
      api('/api/tasks', {
        base,
        method: 'POST',
        body: { title: '止めても残る' },
        headers: { 'idempotency-key': 'restart-key-0001' },
      });
    const r1 = await send();
    assert.equal(r1.status, 201);
    const t1 = await r1.json();
    await stopServer(s1);
    s2 = await startServer(9492, {}, { schema: s1.schema }); // 同じスキーマで起動し直す
    assert.deepEqual(await (await api(`/api/tasks/${t1.id}`, { base })).json(), t1);
    const r2 = await send();
    assert.equal(r2.status, 201);
    assert.equal(r2.headers.get('idempotent-replayed'), 'true', '冪等キーも、データベースに残っている');
    assert.equal((await (await api('/api/tasks?limit=100', { base })).json()).items.length, 1);
  } finally {
    await stopServer(s1);
    await stopServer(s2);
  }
});

test('29. 2台のサーバに、同じ Idempotency-Key の POST が同時に来ても、できるのは1つ', async () => {
  const base2 = 'http://127.0.0.1:9492';
  const s2 = await startServer(9492, {}, { schema: server.schema }); // 1台目と同じデータベース（スキーマ）を使う2台目
  try {
    // 変更（第10部）: セッションもデータベースにあるので、1台目でログインした Cookie を、2台目にも使える
    const cookie = jar.get(BASE);
    assert.ok(cookie !== undefined);
    jar.set(base2, cookie);
    const send = (base: string) =>
      api('/api/tasks', {
        base,
        method: 'POST',
        body: { title: '2台で1つ' },
        headers: { 'idempotency-key': 'two-servers-0001' },
      });
    const results = await Promise.all([send(BASE), send(base2), send(BASE), send(base2)]);
    for (const r of results) assert.ok([201, 409].includes(r.status), `${r.status}`); // 409 は「同じリクエストを処理中」
    assert.ok(results.some((r) => r.status === 201));
    const list = (await (await api('/api/tasks?limit=100')).json()).items;
    assert.equal(list.filter((t: { title: string }) => t.title === '2台で1つ').length, 1);
    // 2台目で作ったものも、1台目から見える
    const created = await (
      await api('/api/tasks', { base: base2, method: 'POST', body: { title: '2台目で作った' } })
    ).json();
    assert.equal((await api(`/api/tasks/${created.id}`)).status, 200);
  } finally {
    await stopServer(s2);
  }
});

test('30. データベースにつなげなければ、終了コード 1。パスワードはログに書かない', async () => {
  const secret = 'dev-only-not-a-real-password';
  const child = spawn(process.execPath, [SERVER], {
    env: {
      ...process.env,
      NODE_ENV: 'test',
      LOG_LEVEL: 'info',
      PORT: '9492',
      DATABASE_URL: `postgres://app:${secret}@127.0.0.1:1/taskapi`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (d: Buffer) => (out += String(d)));
  child.stderr.on('data', (d: Buffer) => (out += String(d)));
  const code = await new Promise<number | null>((r) => child.once('exit', r));
  assert.equal(code, 1, out);
  assert.match(out, /app:\*\*\*@127\.0\.0\.1:1/, 'どこにつなごうとしたかは、パスワードを隠して書く');
  assert.ok(!out.includes(secret), out);
});
