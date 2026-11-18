// 練習問題2 のテスト
// 使い方: node --test log-stats.test.ts
//   模範解答を試す: MODULE=../solutions/log-stats.ts node --test log-stats.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './log-stats.ts');
const { logStats }: typeof import('./log-stats.ts') = await import(pathToFileURL(file).href);

const req = (url: string, status: number, ms: number) => JSON.stringify({ level: 30, time: 1, reqId: 'r', method: 'GET', url, status, ms, msg: 'request' });
const LOG = [
  JSON.stringify({ level: 30, time: 1, port: 9867, msg: '起動しました' }),
  req('/fast', 200, 2),
  req('/cpu', 200, 31),
  req('/nothing', 404, 1),
  JSON.stringify({ level: 50, time: 2, reqId: 'r9', errorId: 'e-1', err: { type: 'Error', message: 'つながりません', stack: '...' }, msg: 'unhandled error' }),
  req('/boom', 500, 3),
  req('/io', 200, 51),
  req('/cpu', 200, 31),
];

test('request の行を数え、状態を 100 の位ごとに数える', () => {
  const s = logStats(LOG);
  assert.equal(s.requests, 6);
  assert.deepEqual(s.byStatus, { '2xx': 4, '4xx': 1, '5xx': 1 });
});

test('遅い順に 3 つ。同じ ms なら先に出た行が先', () => {
  assert.deepEqual(logStats(LOG).slowest, [
    { url: '/io', ms: 51 },
    { url: '/cpu', ms: 31 },
    { url: '/cpu', ms: 31 },
  ]);
  assert.deepEqual(logStats([req('/a', 200, 5)]).slowest, [{ url: '/a', ms: 5 }]);
});

test('level が 50 以上の行の errorId と message', () => {
  assert.deepEqual(logStats(LOG).errors, [{ errorId: 'e-1', message: 'つながりません' }]);
  const fatal = JSON.stringify({ level: 60, errorId: 'e-2', err: { message: '止まります' }, msg: 'fatal' });
  assert.deepEqual(logStats([fatal]).errors, [{ errorId: 'e-2', message: '止まります' }]);
});

test('JSON でない行・オブジェクトでない行は数えて飛ばす。空の行は数えない', () => {
  const s = logStats(['not json', '[1,2]', '42', '"text"', 'null', '', req('/fast', 200, 1)]);
  assert.equal(s.skipped, 5);
  assert.equal(s.requests, 1);
});

test('項目が足りない・型が違う request の行は、数えない（例外にしない）', () => {
  const s = logStats([
    JSON.stringify({ msg: 'request', url: '/a', status: '200', ms: 1 }),
    JSON.stringify({ msg: 'request', url: '/b', ms: 1 }),
    JSON.stringify({ level: 50, msg: 'errorId の無いエラー' }),
  ]);
  assert.equal(s.requests, 0);
  assert.deepEqual(s.byStatus, {});
  assert.deepEqual(s.errors, []);
});

test('空の配列', () => {
  assert.deepEqual(logStats([]), { requests: 0, byStatus: {}, slowest: [], errors: [], skipped: 0 });
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
