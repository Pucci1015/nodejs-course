// 練習問題7 のテスト: 偽物の休みの日の API を、テストの中で起動する
// 使い方: node --test holiday-client.test.ts
//   模範解答を試す: MODULE=../solutions/holiday-client.ts node --test holiday-client.test.ts
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { UpstreamError } from './holidays.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './holiday-client.ts');
const { createHolidayClient }: typeof import('./holiday-client.ts') = await import(pathToFileURL(file).href);

// 偽物の API: /holidays/2026 などに答える。fail を true にすると 503、delayMs だけ遅らせる
const DATA: Record<string, { date: string; name: string }[]> = {
  '2026': [{ date: '2026-01-01', name: '元日' }],
  '2027': [{ date: '2027-01-01', name: '元日' }],
};
let requests: string[] = [];
let fail = false;
let delayMs = 0;
const fake = http.createServer((req, res) => {
  requests.push(req.url ?? '');
  setTimeout(() => {
    if (fail) return res.writeHead(503).end();
    const year = (req.url ?? '').split('/').at(-1) ?? '';
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(DATA[year] ?? []));
  }, delayMs);
});
let baseUrl: string;
before(async () => {
  await new Promise<void>((resolve) => fake.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;
});
after(() => {
  fake.closeAllConnections();
  fake.close();
});
beforeEach(() => {
  requests = [];
  fail = false;
  delayMs = 0;
});

// 偽物の時計
function setup(ttlMs = 1000) {
  const clock = { now: 0 };
  const client = createHolidayClient({ baseUrl, ttlMs, now: () => clock.now });
  return { clock, client };
}

test('一覧を返し、同じ年は ttlMs の間、もう一度は頼まない', async () => {
  const { clock, client } = setup();
  assert.deepEqual(await client.get(2026), DATA['2026']);
  clock.now = 999;
  await client.get(2026);
  assert.deepEqual(requests, ['/holidays/2026']);
});

test('年が違えば、別に頼む', async () => {
  const { client } = setup();
  await client.get(2026);
  await client.get(2027);
  assert.deepEqual(requests, ['/holidays/2026', '/holidays/2027']);
});

test('ttlMs たったら、頼み直す', async () => {
  const { clock, client } = setup();
  await client.get(2026);
  clock.now = 1000;
  await client.get(2026);
  assert.equal(requests.length, 2);
});

test('同時に同じ年を頼まれても、API には1回だけ頼む', async () => {
  delayMs = 50;
  const { client } = setup();
  const [a, b] = await Promise.all([client.get(2026), client.get(2026)]);
  assert.deepEqual(a, b);
  assert.equal(requests.length, 1);
});

test('頼み直しが失敗したら、古い一覧を返す', async () => {
  const { clock, client } = setup();
  await client.get(2026);
  clock.now = 5000;
  fail = true;
  assert.deepEqual(await client.get(2026), DATA['2026']);
});

test('一度も読めていなければ、UpstreamError。次に頼まれたら、もう一度頼む', async () => {
  const { client } = setup();
  fail = true;
  await assert.rejects(client.get(2026), UpstreamError);
  fail = false;
  assert.deepEqual(await client.get(2026), DATA['2026']);
  assert.equal(requests.length, 2);
});

test('isHoliday は、日付の年の一覧から探す', async () => {
  const { client } = setup();
  assert.equal(await client.isHoliday('2027-01-01'), true);
  assert.equal(await client.isHoliday('2027-01-02'), false);
  assert.deepEqual(requests, ['/holidays/2027']);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
