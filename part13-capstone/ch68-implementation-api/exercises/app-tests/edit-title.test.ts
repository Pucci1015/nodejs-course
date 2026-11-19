// 第68章 練習問題7 のテスト（仕様）: 予約の題名を変える PATCH /api/bookings/:id
// ~/dev/room-booking の test/http/ にコピーして動かす（helpers.ts を import するため）
//   $ cp （このファイル） ~/dev/room-booking/test/http/
//   $ cd ~/dev/room-booking && node --test test/http/edit-title.test.ts
// 書く前は、PATCH の道が無いので 404 になり、6 個のうち 5 個が失敗する
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { addDays, tokyoParts } from '../../src/domain/time.ts';
import * as h from '../support/helpers.ts';

let server: h.Server;
let admin: string;
let alice: string;
let aliceEmail: string;
let bob: string;
let room: number;

const day = (n: number) => addDays(tokyoParts(new Date()).date, n);
const at = (n: number, hm: string) => `${day(n)}T${hm}:00+09:00`;

before(async () => {
  server = await h.startServer(await h.freePort());
  admin = await h.signUpAdmin(server);
  aliceEmail = h.newEmail('alice');
  alice = (await h.signUp(server.base, aliceEmail, { remember: false })).cookie;
  bob = (await h.signUp(server.base, h.newEmail('bob'), { remember: false })).cookie;
  const r = await api('/api/rooms', admin, { method: 'POST', body: { name: '会議室A', capacity: 6 } });
  room = (await r.json()).id;
});
after(async () => {
  await h.stopServer(server);
  await h.cleanup();
});

const api = (p: string, cookie: string | null, o: { method?: string; body?: unknown } = {}) =>
  h.api(p, { base: server.base, cookie, ...o });

/** alice の予約を、テストごとに違う日の hour 時から 1 時間で入れて、id を返す */
let count = 0;
async function aliceBooks(hour = 10): Promise<number> {
  const n = 1 + ++count; // テストごとに日をずらす（重ならないように）
  const r = await api('/api/bookings', alice, {
    method: 'POST',
    body: { roomId: room, title: '定例', startsAt: at(n, `${hour}:00`), endsAt: at(n, `${hour + 1}:00`) },
  });
  assert.equal(r.status, 201, await r.clone().text());
  return (await r.json()).id;
}

const rename = (id: number | string, cookie: string | null, body: unknown) =>
  api(`/api/bookings/${id}`, cookie, { method: 'PATCH', body });

test('1. 本人は題名を変えられる（200 で、変えた後の予約を返す。前後の空白は取る）', async () => {
  const id = await aliceBooks();
  const before = await (await api(`/api/bookings/${id}`, alice)).json();
  const r = await rename(id, alice, { title: ' 定例（場所変更） ' });
  assert.equal(r.status, 200, await r.clone().text());
  assert.deepEqual(await r.json(), { ...before, title: '定例（場所変更）' });
  assert.equal(
    (await (await api(`/api/bookings/${id}`, bob)).json()).title,
    '定例（場所変更）',
    'ほかの人にも新しい題名',
  );
});

test('2. 本人でなければ 403（管理者も。取り消しとちがい、題名は本人だけが決める）', async () => {
  const id = await aliceBooks();
  await h.problem(await rename(id, bob, { title: 'x' }), 403);
  await h.problem(await rename(id, admin, { title: 'x' }), 403);
  assert.equal((await (await api(`/api/bookings/${id}`, alice)).json()).title, '定例');
});

test('3. 題名の形が合わなければ 422（空・101 文字・知らない項目・何も無い）', async () => {
  const id = await aliceBooks();
  for (const body of [{ title: '  ' }, { title: 'あ'.repeat(101) }, { title: 'x', roomId: room }, {}]) {
    await h.problem(await rename(id, alice, body), 422);
  }
  assert.equal((await rename(id, alice, { title: 'あ'.repeat(100) })).status, 200, '100 文字まではよい');
});

test('4. 取り消した予約・始まった予約は 409。無い予約は 404', async () => {
  const id = await aliceBooks();
  assert.equal((await api(`/api/bookings/${id}`, alice, { method: 'DELETE' })).status, 204);
  await h.problem(await rename(id, alice, { title: 'x' }), 409);

  // 始まった予約は API では作れないので、SQL で入れる（alice の、1時間前に始まった予約）
  const { rows } = await h.sqlIn(
    server,
    `INSERT INTO bookings (room_id, user_id, title, starts_at, ends_at)
     SELECT $1, id, '進行中', now() - interval '1 hour', now() + interval '1 hour' FROM users WHERE email = $2
     RETURNING id`,
    [room, aliceEmail],
  );
  await h.problem(await rename(rows[0].id, alice, { title: 'x' }), 409);
  await h.problem(await rename(999999, alice, { title: 'x' }), 404);
});

test('5. ログインしていなければ 401。ほかのオリジンからは 403', async () => {
  const id = await aliceBooks();
  await h.problem(await rename(id, null, { title: 'x' }), 401);
  const r = await h.api(`/api/bookings/${id}`, {
    base: server.base,
    cookie: alice,
    method: 'PATCH',
    headers: { origin: 'http://evil.example' },
    body: { title: 'x' },
  });
  await h.problem(r, 403);
});

test('6. 題名を変えても、時刻と会議室は変わらない（一覧の中身で確かめる）', async () => {
  const id = await aliceBooks(14);
  const date = day(1 + count);
  await rename(id, alice, { title: '変えた' });
  const items = (await (await api(`/api/bookings?date=${date}`, alice)).json()).items;
  const b = items.find((x: { id: number }) => x.id === id);
  assert.equal(b.title, '変えた');
  assert.equal(b.startsAt, new Date(at(1 + count, '14:00')).toISOString());
  assert.equal(b.roomId, room);
});
