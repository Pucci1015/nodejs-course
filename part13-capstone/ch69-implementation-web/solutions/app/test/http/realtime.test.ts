// 知らせ（SSE）・管理者の取り消しのメール・前日のリマインドを「外から」確かめるテスト（第69章）
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { addDays, tokyoParts } from '../../src/domain/time.ts';
import * as h from '../support/helpers.ts';

let server: h.Server;
let admin: string;
let room: number;

const day = (n: number) => addDays(tokyoParts(new Date()).date, n);
const at = (n: number, hm: string) => `${day(n)}T${hm}:00+09:00`;
const api = (p: string, cookie: string | null, o: { method?: string; body?: unknown } = {}) =>
  h.api(p, { base: server.base, cookie, ...o });

before(async () => {
  server = await h.startServer(await h.freePort());
  admin = await h.signUpAdmin(server);
  room = (await (await api('/api/rooms', admin, { method: 'POST', body: { name: '会議室A', capacity: 6 } })).json()).id;
});
after(async () => {
  await h.stopServer(server);
  await h.cleanup();
});

test('1. SSE: 予約が入った・取り消されたことが、ログインしている全員に届く', async () => {
  const alice = (await h.signUp(server.base, h.newEmail('alice'), { remember: false })).cookie;
  const bob = (await h.signUp(server.base, h.newEmail('bob'), { remember: false })).cookie;
  const es = await h.openEvents({ base: server.base, cookie: bob });
  try {
    await es.waitFor((e) => e.retry !== undefined);
    const r = await api('/api/bookings', alice, {
      method: 'POST',
      body: { roomId: room, title: '定例', startsAt: at(1, '10:00'), endsAt: at(1, '11:00') },
    });
    const { id } = await r.json();
    const created = await es.waitFor((e) => e.event === 'booking.created');
    assert.deepEqual(JSON.parse(created.data ?? ''), { id, roomId: room, date: day(1) }); // 題名もだれかも入れない
    await api(`/api/bookings/${id}`, alice, { method: 'DELETE' });
    const canceled = await es.waitFor((e) => e.event === 'booking.canceled');
    assert.deepEqual(JSON.parse(canceled.data ?? ''), { id, roomId: room, date: day(1) });
  } finally {
    es.close();
  }
});

test('2. SSE はログインしていなければ 401', async () => {
  await h.problem(await api('/api/events', null), 401);
});

test('3. 管理者がほかの人の予約を取り消すと、予約した人にメールが届く。自分で取り消したときは届かない', async () => {
  const carolEmail = h.newEmail('carol');
  const carol = (await h.signUp(server.base, carolEmail, { remember: false })).cookie;
  const mk = async (hm: string) =>
    (
      await (
        await api('/api/bookings', carol, {
          method: 'POST',
          body: { roomId: room, title: '面談', startsAt: at(2, hm), endsAt: at(2, hm.replace(':00', ':30')) },
        })
      ).json()
    ).id;
  const a = await mk('10:00');
  const b = await mk('11:00');
  assert.equal((await api(`/api/bookings/${a}`, admin, { method: 'DELETE' })).status, 204);
  const mail = await h.takeMail(carolEmail);
  assert.equal(mail.subject, '予約が取り消されました');
  const [, m, d] = day(2).split('-');
  assert.match(mail.text, new RegExp(`${Number(m)}/${Number(d)} 10:00〜10:30 会議室A「面談」`));

  assert.equal((await api(`/api/bookings/${b}`, carol, { method: 'DELETE' })).status, 204);
  await h.noMail(carolEmail);
});

test('4. リマインド: 翌日の予約がある人に1通ずつ。2回動いても、2通目は送らない', async () => {
  const daveEmail = h.newEmail('dave');
  const dave = (await h.signUp(server.base, daveEmail, { remember: false })).cookie;
  for (const hm of ['15:00', '13:00'])
    await api('/api/bookings', dave, {
      method: 'POST',
      body: { roomId: room, title: `打ち合わせ ${hm}`, startsAt: at(3, hm), endsAt: at(3, hm.replace(':00', ':30')) },
    });
  // 決まった時刻（18:00）を待たずに、同じ列に仕事を入れて動かす。日は3日後を指定する
  await h.addJob(server, 'send-reminders', { day: day(3) });
  const mail = await h.takeMail(daveEmail, 5000);
  assert.match(mail.subject, /^明日（\d+\/\d+）の会議室の予約$/);
  // 早い順に、2件とも1通に入る
  assert.ok(mail.text.indexOf('13:00〜13:30') < mail.text.indexOf('15:00〜15:30'), mail.text);
  await h.addJob(server, 'send-reminders', { day: day(3) });
  await h.noMail(daveEmail, 1000);
  const { rows } = await h.sqlIn(server, 'SELECT count(*)::int AS n FROM reminder_log WHERE day = $1', [day(3)]);
  assert.equal(rows[0].n, 1);
});
