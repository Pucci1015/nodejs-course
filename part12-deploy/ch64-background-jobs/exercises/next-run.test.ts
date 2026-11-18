// 練習問題3 のテスト
// 使い方: node --test next-run.test.ts
//   模範解答を試す: MODULE=../solutions/next-run.ts node --test next-run.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './next-run.ts');
const { nextDailyRun, localDay }: typeof import('./next-run.ts') = await import(pathToFileURL(file).href);

const jst8 = { hour: 8, minute: 0, utcOffsetMinutes: 540 };
const iso = (d: Date) => d.toISOString();

test('日本時間の朝 8:00 より前なら、その日の 8:00（UTC では前の日の 23:00）', () => {
  // 2026-11-18 07:30 JST = 2026-11-17 22:30 UTC
  assert.equal(iso(nextDailyRun(new Date('2026-11-17T22:30:00Z'), jst8)), '2026-11-17T23:00:00.000Z');
});

test('8:00 を過ぎていたら、次の日の 8:00', () => {
  // 2026-11-18 14:00 JST
  assert.equal(iso(nextDailyRun(new Date('2026-11-18T05:00:00Z'), jst8)), '2026-11-18T23:00:00.000Z');
});

test('ちょうど 8:00 なら、次の日（同じ時刻はふくまない）', () => {
  assert.equal(iso(nextDailyRun(new Date('2026-11-17T23:00:00Z'), jst8)), '2026-11-18T23:00:00.000Z');
});

test('月・年の境目', () => {
  // 2026-12-31 23:30 JST → 2027-01-01 08:00 JST
  assert.equal(iso(nextDailyRun(new Date('2026-12-31T14:30:00Z'), jst8)), '2026-12-31T23:00:00.000Z');
  // 2027-02-28 09:00 JST → 2027-03-01 08:00 JST
  assert.equal(iso(nextDailyRun(new Date('2027-02-28T00:00:00Z'), jst8)), '2027-02-28T23:00:00.000Z');
});

test('分も、ほかの地域（UTC そのもの・マイナスのずれ）も', () => {
  assert.equal(iso(nextDailyRun(new Date('2026-11-18T10:00:00Z'), { hour: 9, minute: 30, utcOffsetMinutes: 0 })), '2026-11-19T09:30:00.000Z');
  // UTC-5 の 21:15 = UTC 02:15
  assert.equal(iso(nextDailyRun(new Date('2026-11-18T03:00:00Z'), { hour: 21, minute: 15, utcOffsetMinutes: -300 })), '2026-11-19T02:15:00.000Z');
});

test('localDay: その地域の日付', () => {
  assert.equal(localDay(new Date('2026-11-17T23:00:00Z'), 540), '2026-11-18');
  assert.equal(localDay(new Date('2026-11-17T14:59:59Z'), 540), '2026-11-17');
  assert.equal(localDay(new Date('2026-11-17T15:00:00Z'), 540), '2026-11-18');
  assert.equal(localDay(new Date('2026-01-01T03:00:00Z'), -300), '2025-12-31');
});

test('hour・minute が範囲の外なら例外', () => {
  assert.throws(() => nextDailyRun(new Date(), { ...jst8, hour: 24 }), /hour/);
  assert.throws(() => nextDailyRun(new Date(), { ...jst8, minute: 60 }), /minute/);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
