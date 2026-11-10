// 練習問題8 用: log-stream.mjs の summarizeLogFile のテスト
// 使い方: node --test log-stream.test.mjs
//   模範解答を試す: MODULE=../solutions/log-stream.mjs node --test log-stream.test.mjs
// テスト用のファイルは、OS の一時フォルダの中に作って、最後に消します。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';
import zlib from 'node:zlib';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './log-stream.mjs');
const { summarizeLogFile } = await import(pathToFileURL(modulePath).href);

const ACCESS_LOG = path.resolve(import.meta.dirname, '../../ch11-js-refresher/exercises/access.log');
let dir;
before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ch15-log-test-'));
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

const expected = {
  total: 80,
  invalid: 0,
  byStatusClass: { '2xx': 43, '3xx': 13, '4xx': 17, '5xx': 7 },
  bytesTotal: 373903,
  topPaths: [
    { path: '/tasks', count: 18 },
    { path: '/static/app.js', count: 12 },
    { path: '/', count: 11 },
  ],
};

function assertSummary(s, want) {
  for (const key of Object.keys(want)) assert.deepEqual(s[key], want[key], key);
}

test('第1部のアクセスログを集計する（第11章と同じ結果）', async () => {
  const s = await summarizeLogFile(ACCESS_LOG);
  assertSummary(s, expected);
  assert.equal(s.first.toISOString(), '2026-11-04T00:03:15.000Z');
  assert.equal(s.last.toISOString(), '2026-11-04T04:56:47.000Z');
});

test('gzip で圧縮したログ（.gz）も、そのまま読める', async () => {
  const gz = path.join(dir, 'access.log.gz');
  await pipeline(fs.createReadStream(ACCESS_LOG), zlib.createGzip(), fs.createWriteStream(gz));
  assertSummary(await summarizeLogFile(gz), expected);
});

test('解析できない行は invalid に数え、空の行は数えない。CRLF の行も読める', async () => {
  const file = path.join(dir, 'mixed.log');
  fs.writeFileSync(
    file,
    [
      '192.0.2.1 - - [04/Nov/2026:10:00:00 +0900] "GET /a HTTP/1.1" 200 10',
      'これはログの行ではない',
      '',
      '192.0.2.2 - - [04/Nov/2026:10:00:01 +0900] "GET /a HTTP/1.1" 404 5',
    ].join('\r\n'),
  );
  const s = await summarizeLogFile(file, { top: 1 });
  assertSummary(s, { total: 2, invalid: 1, byStatusClass: { '2xx': 1, '4xx': 1 }, bytesTotal: 15, topPaths: [{ path: '/a', count: 2 }] });
});

test('15万行のログ（.gz）も集計できる', { timeout: 60_000 }, async () => {
  const gz = path.join(dir, 'big.log.gz');
  const lines = (function* () {
    for (let i = 0; i < 150_000; i++) {
      const sec = String(i % 60).padStart(2, '0');
      const min = String(Math.floor(i / 60) % 60).padStart(2, '0');
      yield `198.51.100.${i % 200} - - [05/Nov/2026:10:${min}:${sec} +0900] "GET /items/${i % 7} HTTP/1.1" ${i % 10 === 0 ? 500 : 200} 100\n`;
    }
  })();
  await pipeline(lines, zlib.createGzip(), fs.createWriteStream(gz));
  const s = await summarizeLogFile(gz);
  assertSummary(s, { total: 150_000, invalid: 0, byStatusClass: { '2xx': 135_000, '5xx': 15_000 }, bytesTotal: 15_000_000 });
  assert.equal(s.topPaths[0].count, 21429);
  assert.equal(s.first.toISOString(), '2026-11-05T01:00:00.000Z');
  assert.equal(s.last.toISOString(), '2026-11-05T01:59:59.000Z');
});

test('空のファイルなら、0 件と null', async () => {
  const file = path.join(dir, 'empty.log');
  fs.writeFileSync(file, '');
  const s = await summarizeLogFile(file);
  assertSummary(s, { total: 0, invalid: 0, byStatusClass: {}, bytesTotal: 0, topPaths: [], first: null, last: null });
});

test('無いファイルなら ENOENT で rejected（.gz でも）', async () => {
  await assert.rejects(summarizeLogFile(path.join(dir, 'none.log')), { code: 'ENOENT' });
  await assert.rejects(summarizeLogFile(path.join(dir, 'none.log.gz')), { code: 'ENOENT' });
});

test('壊れた .gz なら rejected（途中まで集計した結果を返さない）', async () => {
  const gz = path.join(dir, 'broken.log.gz');
  const good = zlib.gzipSync(fs.readFileSync(ACCESS_LOG));
  fs.writeFileSync(gz, good.subarray(0, good.length / 2)); // 後ろ半分が無い
  await assert.rejects(summarizeLogFile(gz));
});
