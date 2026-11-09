// 練習問題6のテスト
// 使い方: node --test long-poll.test.mjs
//         MODULE=../solutions/long-poll.mjs node --test long-poll.test.mjs   （解答例で確かめる）
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';

const { createWaiter, longPollRoute } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './long-poll.mjs')).href);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('1. notifyAll で、待っている全員が notified になる', async () => {
  const w = createWaiter();
  const a = w.wait({ timeoutMs: 1000 });
  const b = w.wait({ timeoutMs: 1000 });
  assert.equal(w.waiting(), 2);
  w.notifyAll();
  assert.deepEqual(await Promise.all([a, b]), ['notified', 'notified']);
  assert.equal(w.waiting(), 0);
});

test('2. 時間が来たら timeout。その後は、待っている数に入らない', async () => {
  const w = createWaiter();
  assert.equal(await w.wait({ timeoutMs: 30 }), 'timeout');
  assert.equal(w.waiting(), 0);
});

test('3. signal で止めたら aborted。待っている数に入らない', async () => {
  const w = createWaiter();
  const ac = new AbortController();
  const p = w.wait({ timeoutMs: 1000, signal: ac.signal });
  ac.abort();
  assert.equal(await p, 'aborted');
  assert.equal(w.waiting(), 0);
  assert.equal(await w.wait({ timeoutMs: 1000, signal: AbortSignal.abort() }), 'aborted'); // 始める前に止まっていたら、すぐ
});

test('4. 1000 人が待って、途中で切っても、何も残らない', async () => {
  const w = createWaiter();
  const warnings = [];
  const onWarn = (e) => warnings.push(e.name);
  process.on('warning', onWarn);
  const acs = Array.from({ length: 1000 }, () => new AbortController());
  const ps = acs.map((ac) => w.wait({ timeoutMs: 5000, signal: ac.signal }));
  assert.equal(w.waiting(), 1000);
  for (const ac of acs) ac.abort();
  await Promise.all(ps);
  assert.equal(w.waiting(), 0);
  await sleep(10);
  process.off('warning', onWarn);
  assert.deepEqual(warnings, [], 'MaxListenersExceededWarning などの警告が出た');
});

// ---- ここから HTTP

const events = [];
const waiter = createWaiter();
const app = express();
app.get('/events', longPollRoute({ list: (since) => events.filter((e) => e.id > since), waiter, timeoutMs: 300 }));
const server = await new Promise((r) => {
  const s = app.listen(0, '127.0.0.1', () => r(s));
});
const base = `http://127.0.0.1:${server.address().port}`;
after(() => {
  server.closeAllConnections();
  server.close();
});
const add = (text) => {
  events.push({ id: events.length + 1, text });
  waiter.notifyAll();
};
const get = (url) => fetch(base + url, { signal: AbortSignal.timeout(2000) });

test('5. 新しいものがあれば、すぐに返す', async () => {
  add('a');
  const t = Date.now();
  const res = await get('/events?since=0');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { items: [{ id: 1, text: 'a' }], last: 1 });
  assert.ok(Date.now() - t < 200);
});

test('6. 無ければ待ち、来たらすぐに返す', async () => {
  const p = get('/events?since=1');
  await sleep(100);
  add('b');
  const res = await p;
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).items, [{ id: 2, text: 'b' }]);
});

test('7. 時間内に来なければ 204', async () => {
  const res = await get('/events?since=99');
  assert.equal(res.status, 204);
  assert.equal(waiter.waiting(), 0);
});

test('8. 客が先に切ったら、待つのをやめる', async () => {
  await new Promise((resolve) => {
    const req = http.get(`${base}/events?since=99`);
    req.on('error', () => {});
    setTimeout(() => {
      assert.equal(waiter.waiting(), 1);
      req.destroy();
      resolve();
    }, 80);
  });
  await sleep(50);
  assert.equal(waiter.waiting(), 0, '切れた客を、まだ待っている');
});

test('9. since は 0 以上の整数（それ以外は 400）', async () => {
  for (const s of ['abc', '-1', '1.5', '']) assert.equal((await get(`/events?since=${s}`)).status, 400, s);
});
