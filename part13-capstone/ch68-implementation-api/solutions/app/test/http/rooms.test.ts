// 会議室の API（docs/api.md の「会議室」）を「外から」確かめるテスト（第68章）
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import * as h from '../support/helpers.ts';

let server: h.Server;
let admin: string;
let member: string;
before(async () => {
  server = await h.startServer(await h.freePort());
  admin = await h.signUpAdmin(server);
  member = (await h.signUp(server.base, h.newEmail('member'), { remember: false })).cookie;
});
after(async () => {
  await h.stopServer(server);
  await h.cleanup();
});

const api = (p: string, cookie: string | null, o: { method?: string; body?: unknown } = {}) =>
  h.api(p, { base: server.base, cookie, ...o });

test('1. 管理者は会議室を作れる（201 + Location）。名前は前後の空白を除く', async () => {
  const r = await api('/api/rooms', admin, { method: 'POST', body: { name: ' 会議室A ', capacity: 6 } });
  assert.equal(r.status, 201);
  const room = await r.json();
  assert.deepEqual(room, { id: room.id, name: '会議室A', capacity: 6, active: true });
  assert.equal(r.headers.get('location'), `/api/rooms/${room.id}`);
});

test('2. メンバーは会議室を見るだけ。作る・変える・?all=1 は 403', async () => {
  await api('/api/rooms', admin, { method: 'POST', body: { name: '会議室B', capacity: 4 } });
  const list = await (await api('/api/rooms', member)).json();
  assert.ok(list.items.some((x: { name: string }) => x.name === '会議室B'));
  await h.problem(await api('/api/rooms', member, { method: 'POST', body: { name: '会議室Z', capacity: 4 } }), 403);
  await h.problem(
    await api(`/api/rooms/${list.items[0].id}`, member, { method: 'PATCH', body: { capacity: 99 } }),
    403,
  );
  await h.problem(await api('/api/rooms?all=1', member), 403);
});

test('3. ログインしていなければ 401。知らないクエリは 400', async () => {
  await h.problem(await api('/api/rooms', null), 401);
  await h.problem(await api('/api/rooms?all=yes', admin), 400);
  await h.problem(await api('/api/rooms?sort=name', admin), 400);
});

test('4. 入力の間違いは 422（pointer）。名前が重なれば 409', async () => {
  for (const [body, pointer] of [
    [{ name: '', capacity: 4 }, '#/name'],
    [{ name: 'x'.repeat(51), capacity: 4 }, '#/name'],
    [{ name: '会議室C', capacity: 0 }, '#/capacity'],
    [{ name: '会議室C', capacity: 101 }, '#/capacity'],
    [{ name: '会議室C', capacity: 4.5 }, '#/capacity'],
    [{ name: '会議室C' }, '#/capacity'],
  ] as const) {
    const p = await h.problem(await api('/api/rooms', admin, { method: 'POST', body }), 422);
    assert.ok(
      p.errors.some((e: { pointer: string }) => e.pointer === pointer),
      JSON.stringify(p),
    );
  }
  await h.problem(await api('/api/rooms', admin, { method: 'POST', body: { name: 'C', capacity: 4, floor: 3 } }), 422);
  await api('/api/rooms', admin, { method: 'POST', body: { name: '会議室D', capacity: 4 } });
  await h.problem(await api('/api/rooms', admin, { method: 'POST', body: { name: '会議室D', capacity: 8 } }), 409);
});

test('5. 管理者は、名前・定員・使えるかを変えられる。停止した会議室は、メンバーの一覧に出ない', async () => {
  const room = await (
    await api('/api/rooms', admin, { method: 'POST', body: { name: '会議室E', capacity: 4 } })
  ).json();
  const r = await api(`/api/rooms/${room.id}`, admin, {
    method: 'PATCH',
    body: { name: '会議室E（大）', capacity: 10 },
  });
  assert.deepEqual(await r.json(), { id: room.id, name: '会議室E（大）', capacity: 10, active: true });

  await api(`/api/rooms/${room.id}`, admin, { method: 'PATCH', body: { active: false } });
  const names = async (p: string, c: string) =>
    (await (await api(p, c)).json()).items.map((x: { name: string }) => x.name);
  assert.ok(!(await names('/api/rooms', member)).includes('会議室E（大）'));
  assert.ok((await names('/api/rooms?all=1', admin)).includes('会議室E（大）'));

  await h.problem(await api(`/api/rooms/${room.id}`, admin, { method: 'PATCH', body: {} }), 422);
  await h.problem(await api('/api/rooms/999999', admin, { method: 'PATCH', body: { capacity: 3 } }), 404);
  await h.problem(await api('/api/rooms/abc', admin, { method: 'PATCH', body: { capacity: 3 } }), 422);
});

test('6. 一覧は名前の順', async () => {
  const names: string[] = (await (await api('/api/rooms', member)).json()).items.map((x: { name: string }) => x.name);
  assert.deepEqual(names, names.toSorted());
});
