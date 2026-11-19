// 練習問題6 のテスト
// 使い方: node --test next-free.test.ts
//   模範解答を試す: MODULE=../solutions/next-free.ts node --test next-free.test.ts
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './next-free.ts');
const mod: typeof import('./next-free.ts') = await import(pathToFileURL(file).href);
const { findNextFree } = mod;

const D = '2026-12-10';
const jst = (hm: string, date = D) => new Date(`${date}T${hm}:00+09:00`);
const b = (s: string, e: string) => ({ startsAt: jst(s), endsAt: jst(e) });
const early = jst('06:00'); // まだ何も過ぎていない「今」
const iso = (d: Date | null) => d?.toISOString() ?? null;

test('予約が無ければ 8:00', () => {
  assert.equal(iso(findNextFree(D, [], 60, early)), iso(jst('08:00')));
});

test('予約の後ろの、入る所。接するのはよい', () => {
  assert.equal(iso(findNextFree(D, [b('08:00', '09:00')], 60, early)), iso(jst('09:00')));
  // 9:00〜9:30 は 30 分しか空いていないので、1 時間は 10:30 から
  const day = [b('08:00', '09:00'), b('09:30', '10:30')];
  assert.equal(iso(findNextFree(D, day, 30, early)), iso(jst('09:00')));
  assert.equal(iso(findNextFree(D, day, 60, early)), iso(jst('10:30')));
});

test('now より後の区切りから。区切りちょうどの now は、もう過ぎている', () => {
  assert.equal(iso(findNextFree(D, [], 30, jst('10:17'))), iso(jst('10:30')));
  assert.equal(iso(findNextFree(D, [], 30, jst('10:30'))), iso(jst('11:00')));
});

test('21:00 までに終わらなければ null', () => {
  assert.equal(iso(findNextFree(D, [], 180, jst('18:10'))), null);
  assert.equal(iso(findNextFree(D, [], 120, jst('18:10'))), iso(jst('18:30')));
  assert.equal(iso(findNextFree(D, [b('08:00', '21:00')], 30, early)), null);
  assert.equal(iso(findNextFree(D, [], 30, jst('09:00', '2026-12-11'))), null); // 次の日になっている
});

test('長さが決まりに合わなければ RangeError', () => {
  for (const m of [0, 45, 210]) assert.throws(() => findNextFree(D, [], m, early), RangeError, String(m));
});

test('tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
