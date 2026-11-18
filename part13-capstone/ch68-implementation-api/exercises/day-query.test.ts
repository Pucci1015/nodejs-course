// 練習問題3 のテスト
// 使い方: node --test day-query.test.ts
//   模範解答を試す: MODULE=../solutions/day-query.ts node --test day-query.test.ts
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './day-query.ts');
const mod: typeof import('./day-query.ts') = await import(pathToFileURL(file).href);
const { parseDayQuery } = mod;

test('date だけ・date と room', () => {
  assert.deepEqual(parseDayQuery({ date: '2026-12-10' }), { ok: true, value: { date: '2026-12-10' } });
  assert.deepEqual(parseDayQuery({ date: '2026-12-10', room: '12' }), {
    ok: true,
    value: { date: '2026-12-10', room: 12 },
  });
});

test('date が無い・日付でない', () => {
  const a = parseDayQuery({});
  assert.equal(a.ok, false);
  assert.deepEqual(!a.ok && a.issues.map((i) => i.parameter), ['date']);
  const b = parseDayQuery({ date: '2026-02-30' });
  assert.deepEqual(!b.ok && b.issues.map((i) => i.parameter), ['date']);
});

test('room が 1 以上の整数の文字列でない', () => {
  for (const room of ['0', '01', '1.5', 'a', '', '-1']) {
    const r = parseDayQuery({ date: '2026-12-10', room });
    assert.deepEqual(!r.ok && r.issues.map((i) => i.parameter), ['room'], room);
  }
});

test('同じ名前が2回（配列）・知らない名前もだめ。合わないところは全部返す', () => {
  const r = parseDayQuery({ date: ['2026-12-10', '2026-12-11'], room: 'x', sort: 'title' });
  assert.equal(r.ok, false);
  assert.deepEqual(!r.ok && r.issues.map((i) => i.parameter).toSorted(), ['date', 'room', 'sort']);
  assert.ok(!r.ok && r.issues.find((i) => i.parameter === 'sort')?.detail.includes('知らない名前です'));
});

test('tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
