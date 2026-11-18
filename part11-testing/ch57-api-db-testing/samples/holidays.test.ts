// 第57章 8節: 外の API の代わりに、テストの中で偽物の HTTP サーバを起動する
// 使い方: node --test samples/holidays.test.ts
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { fetchHolidays, UpstreamError } from './holidays.ts';

// どの道で、どう答えるかを、テストごとに決められる偽物のサーバ
let reply: (res: http.ServerResponse) => void = (res) => res.end();
const requests: string[] = [];
const fake = http.createServer((req, res) => {
  requests.push(`${req.method} ${req.url}`);
  reply(res);
});
let baseUrl: string;
before(async () => {
  await new Promise<void>((resolve) => fake.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;
});
after(() => {
  fake.closeAllConnections(); // 返事をしなかった接続も閉じる
  fake.close();
});

function json(status: number, body: unknown) {
  return (res: http.ServerResponse) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };
}

test('年を URL に入れて頼み、一覧を返す', async () => {
  reply = json(200, [{ date: '2026-01-01', name: '元日' }]);
  const holidays = await fetchHolidays(2026, { baseUrl });
  assert.deepEqual(holidays, [{ date: '2026-01-01', name: '元日' }]);
  assert.equal(requests.at(-1), 'GET /holidays/2026');
});

test('500 なら UpstreamError', async () => {
  reply = json(500, { message: 'error' });
  await assert.rejects(fetchHolidays(2026, { baseUrl }), UpstreamError);
});

test('形が違えば UpstreamError', async () => {
  reply = json(200, [{ day: '2026-01-01' }]);
  await assert.rejects(fetchHolidays(2026, { baseUrl }), /形が違います/);
});

test('答えが来なければ、timeoutMs で UpstreamError', async () => {
  reply = () => {}; // 何も返さない
  await assert.rejects(fetchHolidays(2026, { baseUrl, timeoutMs: 100 }), /つなげません/);
});
