// 練習問題4 用: log-summary.mjs の parseLine と summarize のテスト
// 使い方: node --test log-summary.test.mjs
//   模範解答を試す: MODULE=../solutions/log-summary.mjs node --test log-summary.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './log-summary.mjs');
const { parseLine, summarize } = await import(pathToFileURL(modulePath).href);

// 第1部 第1章のアクセスログ（80行）
const LOG = path.resolve(import.meta.dirname, '../../../part01-mac-dev-env/ch01-terminal-zsh/samples/access.log');
const lines = readFileSync(LOG, 'utf8').split('\n').filter((l) => l !== '');

test('parseLine: 1行を項目に分ける', () => {
  const e = parseLine('203.0.113.5 - - [04/Nov/2026:09:03:15 +0900] "GET /static/style.css HTTP/1.1" 200 911');
  assert.equal(e.ip, '203.0.113.5');
  assert.equal(e.method, 'GET');
  assert.equal(e.path, '/static/style.css');
  assert.equal(e.status, 200);
  assert.equal(e.bytes, 911);
  assert.equal(e.hour, '09');
});

test('parseLine: 時刻はタイムゾーンを考えた Date にする（+0900 の 9時は UTC の 0時）', () => {
  const e = parseLine('203.0.113.5 - - [04/Nov/2026:09:03:15 +0900] "GET / HTTP/1.1" 200 911');
  assert.ok(e.time instanceof Date);
  assert.equal(e.time.toISOString(), '2026-11-04T00:03:15.000Z');
  const f = parseLine('203.0.113.5 - - [31/Dec/2026:23:59:59 -0500] "GET / HTTP/1.1" 200 1');
  assert.equal(f.time.toISOString(), '2027-01-01T04:59:59.000Z');
});

test('parseLine: クエリ文字列は path から取り除く。バイト数の - は 0', () => {
  const e = parseLine('198.51.100.1 - - [04/Nov/2026:10:00:00 +0900] "GET /search?q=node&page=2 HTTP/1.1" 304 -');
  assert.equal(e.path, '/search');
  assert.equal(e.bytes, 0);
  assert.equal(e.status, 304);
});

test('parseLine: 形が違う行は null', () => {
  for (const bad of ['', 'こんにちは', '203.0.113.5 - - [04/Nov/2026:09:03:15 +0900] "GET /" 200 911', '203.0.113.5 - - [04/Foo/2026:09:03:15 +0900] "GET / HTTP/1.1" 200 911']) {
    assert.equal(parseLine(bad), null, bad);
  }
});

test('parseLine: 第1部のログの80行は、すべて読める', () => {
  assert.equal(lines.length, 80);
  assert.ok(lines.map(parseLine).every((e) => e !== null && typeof e === 'object'));
});

test('summarize: 第1部のログを集計する', () => {
  const s = summarize(lines.map(parseLine));
  assert.equal(s.total, 80);
  assert.deepEqual(s.byStatusClass, { '2xx': 43, '3xx': 13, '4xx': 17, '5xx': 7 });
  assert.deepEqual(s.byMethod, { GET: 67, POST: 12, DELETE: 1 });
  assert.deepEqual(s.byHour, { '09': 17, 10: 14, 11: 18, 12: 15, 13: 16 });
  assert.deepEqual(s.topPaths, [
    { path: '/tasks', count: 18 },
    { path: '/static/app.js', count: 12 },
    { path: '/', count: 11 },
  ]);
  assert.equal(s.uniqueIps, 6);
  assert.equal(s.bytesTotal, 373903);
  assert.equal(s.serverErrorRate, 0.088); // 7 / 80 = 0.0875 を小数第3位に丸める
  assert.equal(s.first.toISOString(), '2026-11-04T00:03:15.000Z');
  assert.equal(s.last.toISOString(), '2026-11-04T04:56:47.000Z');
});

test('summarize: top で件数を変えられる。同じ数なら path の順', () => {
  const make = (p) => parseLine(`192.0.2.1 - - [04/Nov/2026:10:00:00 +0900] "GET ${p} HTTP/1.1" 200 1`);
  const s = summarize(['/b', '/a', '/c', '/b', '/a'].map(make), { top: 2 });
  assert.deepEqual(s.topPaths, [
    { path: '/a', count: 2 },
    { path: '/b', count: 2 },
  ]);
});

test('summarize: 空の配列でもエラーにしない', () => {
  const s = summarize([]);
  assert.equal(s.total, 0);
  assert.deepEqual(s.topPaths, []);
  assert.equal(s.serverErrorRate, 0);
  assert.equal(s.first, null);
  assert.equal(s.last, null);
});

test('summarize: 引数の配列を書き換えない', () => {
  const entries = lines.slice(0, 10).map(parseLine);
  assert.ok(entries.every(Boolean));
  const before = structuredClone(entries);
  summarize(entries);
  assert.deepEqual(entries, before);
});
