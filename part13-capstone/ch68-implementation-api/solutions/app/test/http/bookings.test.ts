// 予約の API（docs/api.md の「予約」）を「外から」確かめるテスト（第68章）
// 要件の決まり R1〜R9（docs/requirements.md 4節）を、1つずつ確かめる
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { addDays, tokyoParts } from '../../src/domain/time.ts';
import * as h from '../support/helpers.ts';

let server: h.Server;
let admin: string;
let alice: string;
let bob: string;
let roomA: number;
let roomB: number;

/** 今日（日本）から n 日後の日付 */
const day = (n: number) => addDays(tokyoParts(new Date()).date, n);
/** n 日後の日本の時刻 'HH:MM' を、時差付きの ISO 8601 に */
const at = (n: number, hm: string) => `${day(n)}T${hm}:00+09:00`;

before(async () => {
  server = await h.startServer(await h.freePort());
  admin = await h.signUpAdmin(server);
  alice = (await h.signUp(server.base, h.newEmail('alice'), { remember: false })).cookie;
  bob = (await h.signUp(server.base, h.newEmail('bob'), { remember: false })).cookie;
  const make = async (name: string) =>
    (await (await api('/api/rooms', admin, { method: 'POST', body: { name, capacity: 6 } })).json()).id;
  roomA = await make('会議室A');
  roomB = await make('会議室B');
});
after(async () => {
  await h.stopServer(server);
  await h.cleanup();
});

const api = (p: string, cookie: string | null, o: { method?: string; body?: unknown } = {}) =>
  h.api(p, { base: server.base, cookie, ...o });

/** 予約する。返すのは応答 */
const book = (cookie: string, body: Record<string, unknown>) => api('/api/bookings', cookie, { method: 'POST', body });

/** その日の予約の一覧 */
const onDay = async (cookie: string, n: number) =>
  (await (await api(`/api/bookings?date=${day(n)}`, cookie)).json()).items;

test('1. 予約できる（201 + Location）。ほかの人の一覧にも出るが、だれの予約かは出さない', async () => {
  const r = await book(alice, { roomId: roomA, title: ' 定例 ', startsAt: at(1, '10:00'), endsAt: at(1, '11:00') });
  assert.equal(r.status, 201, await r.clone().text());
  const b = await r.json();
  assert.equal(r.headers.get('location'), `/api/bookings/${b.id}`);
  assert.deepEqual(b, {
    id: b.id,
    roomId: roomA,
    roomName: '会議室A',
    title: '定例',
    startsAt: new Date(at(1, '10:00')).toISOString(),
    endsAt: new Date(at(1, '11:00')).toISOString(),
    mine: true,
  });
  assert.deepEqual(await (await api(`/api/bookings/${b.id}`, alice)).json(), b);

  const seen = (await onDay(bob, 1)).find((x: { id: number }) => x.id === b.id);
  assert.deepEqual(seen, { ...b, mine: false }); // userId もメールアドレスも無い
  assert.equal((await onDay(bob, 2)).length, 0, '次の日には出ない');
});

test('2. R1〜R4: 時刻の決まりに合わなければ 422。合わないところを全部、pointer で返す', async () => {
  const cases = [
    [':15 に始まる', at(1, '13:15'), at(1, '14:15'), ['#/startsAt', '#/endsAt']],
    ['7:30 から', at(1, '07:30'), at(1, '08:30'), ['#/startsAt']],
    ['21:30 まで', at(1, '20:30'), at(1, '21:30'), ['#/startsAt']],
    ['3 時間 30 分', at(1, '13:00'), at(1, '16:30'), ['#/endsAt']],
    ['終わりが始まりより前', at(1, '14:00'), at(1, '13:00'), ['#/endsAt']],
    ['昨日', at(-1, '13:00'), at(-1, '14:00'), ['#/startsAt']],
    ['61 日先', at(61, '13:00'), at(61, '14:00'), ['#/startsAt']],
  ] as const;
  for (const [name, startsAt, endsAt, pointers] of cases) {
    const p = await h.problem(await book(alice, { roomId: roomB, title: name, startsAt, endsAt }), 422);
    assert.deepEqual(
      p.errors.map((e: { pointer: string }) => e.pointer),
      pointers,
      name,
    );
  }
});

test('3. R5 と形: 題名・知らない項目・時差の無い日時は 422。無い会議室は 404', async () => {
  const base = { roomId: roomB, title: 'x', startsAt: at(1, '13:00'), endsAt: at(1, '14:00') };
  for (const body of [
    { ...base, title: '   ' },
    { ...base, title: 'あ'.repeat(101) },
    { ...base, userId: 1 },
    { ...base, startsAt: `${day(1)}T13:00:00` }, // 時差が無いと、どこの 13 時か分からない
    { ...base, roomId: '1' },
  ])
    await h.problem(await book(alice, body), 422);
  await h.problem(await book(alice, { ...base, roomId: 999999 }), 404);
});

test('4. R6: 同じ会議室で重なれば 409。接するだけ・ほかの会議室ならよい', async () => {
  const body = (roomId: number, s: string, e: string) => ({
    roomId,
    title: '打ち合わせ',
    startsAt: at(2, s),
    endsAt: at(2, e),
  });
  assert.equal((await book(alice, body(roomA, '10:00', '11:00'))).status, 201);
  await h.problem(await book(bob, body(roomA, '10:30', '11:30')), 409);
  await h.problem(await book(bob, body(roomA, '09:00', '12:00')), 409);
  assert.equal((await book(bob, body(roomA, '11:00', '11:30'))).status, 201);
  assert.equal((await book(bob, body(roomB, '10:00', '11:00'))).status, 201);
});

test('5. R6: 5人が同時に同じ枠を予約しても、入るのは1人だけ', async () => {
  const people = await Promise.all(
    [1, 2, 3, 4, 5].map(async (i) => (await h.signUp(server.base, h.newEmail(`p${i}`), { remember: false })).cookie),
  );
  const results = await Promise.all(
    people.map((c) => book(c, { roomId: roomA, title: '取り合い', startsAt: at(3, '15:00'), endsAt: at(3, '16:00') })),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409, 409, 409, 409]);
  assert.equal((await onDay(alice, 3)).filter((x: { title: string }) => x.title === '取り合い').length, 1);
});

test('6. R7: これからの予約は 10 件まで。取り消せば、また入れられる', async () => {
  const carol = (await h.signUp(server.base, h.newEmail('carol'), { remember: false })).cookie;
  const ids: number[] = [];
  for (let i = 0; i < 10; i++) {
    const hm = `${String(8 + i).padStart(2, '0')}:00`;
    const r = await book(carol, {
      roomId: roomB,
      title: `${i}`,
      startsAt: at(5, hm),
      endsAt: at(5, hm.replace(':00', ':30')),
    });
    assert.equal(r.status, 201);
    ids.push((await r.json()).id);
  }
  const eleventh = { roomId: roomB, title: '11', startsAt: at(6, '10:00'), endsAt: at(6, '10:30') };
  await h.problem(await book(carol, eleventh), 409);
  assert.equal((await api(`/api/bookings/${ids[0]}`, carol, { method: 'DELETE' })).status, 204);
  assert.equal((await book(carol, eleventh)).status, 201);
});

test('7. R8: 停止した会議室は予約できない（409）', async () => {
  const room = await (await api('/api/rooms', admin, { method: 'POST', body: { name: '倉庫', capacity: 2 } })).json();
  await api(`/api/rooms/${room.id}`, admin, { method: 'PATCH', body: { active: false } });
  await h.problem(
    await book(alice, { roomId: room.id, title: 'x', startsAt: at(1, '15:00'), endsAt: at(1, '16:00') }),
    409,
  );
});

test('8. R9: 取り消せるのは本人か管理者。取り消したものと、始まったものは 409', async () => {
  const mk = async (hm: string) =>
    (
      await (
        await book(alice, {
          roomId: roomB,
          title: '取り消し',
          startsAt: at(7, hm),
          endsAt: at(7, hm.replace(':00', ':30')),
        })
      ).json()
    ).id;
  const a = await mk('10:00');
  await h.problem(await api(`/api/bookings/${a}`, bob, { method: 'DELETE' }), 403);
  assert.equal((await api(`/api/bookings/${a}`, alice, { method: 'DELETE' })).status, 204);
  await h.problem(await api(`/api/bookings/${a}`, alice, { method: 'DELETE' }), 409);
  await h.problem(await api(`/api/bookings/${a}`, alice), 404); // 取り消したものは、無いのと同じ

  const b = await mk('11:00');
  assert.equal((await api(`/api/bookings/${b}`, admin, { method: 'DELETE' })).status, 204, '管理者はだれのものでも');

  // 始まった予約は API では作れないので、SQL で入れる（1時間前に始まって、まだ終わっていない）
  const { rows } = await h.sqlIn(
    server,
    `INSERT INTO bookings (room_id, user_id, title, starts_at, ends_at)
     SELECT $1, id, '進行中', now() - interval '1 hour', now() + interval '1 hour' FROM users WHERE role = 'member' LIMIT 1
     RETURNING id`,
    [roomB],
  );
  await h.problem(await api(`/api/bookings/${rows[0].id}`, admin, { method: 'DELETE' }), 409);
  await h.problem(await api('/api/bookings/999999', alice, { method: 'DELETE' }), 404);
});

test('9. ?date が無い・正しくなければ 400（errors[].parameter）', async () => {
  for (const q of ['', '?date=2026-02-30', '?date=tomorrow', `?date=${day(1)}&room=1`]) {
    const p = await h.problem(await api(`/api/bookings${q}`, alice), 400);
    assert.ok(Array.isArray(p.errors), q);
  }
});

test('10. /mine: 自分の、これからの予約だけ（早い順・取り消したものは出ない）', async () => {
  const dave = (await h.signUp(server.base, h.newEmail('dave'), { remember: false })).cookie;
  const mk = async (n: number, hm: string) =>
    (
      await (
        await book(dave, {
          roomId: roomA,
          title: `${n} ${hm}`,
          startsAt: at(n, hm),
          endsAt: at(n, hm.replace(':00', ':30')),
        })
      ).json()
    ).id;
  await mk(9, '16:00');
  await mk(8, '17:00');
  const gone = await mk(8, '18:00');
  await api(`/api/bookings/${gone}`, dave, { method: 'DELETE' });
  const mine = (await (await api('/api/bookings/mine', dave)).json()).items;
  assert.deepEqual(
    mine.map((b: { title: string; mine: boolean }) => [b.title, b.mine]),
    [
      ['8 17:00', true],
      ['9 16:00', true],
    ],
  );
});

test('11. ログインしていなければ 401。ほかのオリジンからの予約は 403', async () => {
  await h.problem(await api(`/api/bookings?date=${day(1)}`, null), 401);
  await h.problem(await api('/api/bookings/mine', null), 401);
  const r = await h.api('/api/bookings', {
    base: server.base,
    cookie: alice,
    method: 'POST',
    headers: { origin: 'http://evil.example' },
    body: { roomId: roomA, title: 'x', startsAt: at(1, '18:00'), endsAt: at(1, '19:00') },
  });
  await h.problem(r, 403);
});
