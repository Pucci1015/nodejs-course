// 練習問題5 のテスト
// 使い方: node --test grid-cells.test.ts
//   模範解答を試す: MODULE=../solutions/grid-cells.ts node --test grid-cells.test.ts
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './grid-cells.ts');
const mod: typeof import('./grid-cells.ts') = await import(pathToFileURL(file).href);
const { gridCells } = mod;
import { markBusy, slotsOfDay } from './domain/slots.ts';

const DATE = '2026-12-10';
const jst = (hm: string) => new Date(`${DATE}T${hm}:00+09:00`);
const slots = slotsOfDay(DATE); // 8:00〜21:00 の 26 個
const book = (s: string, e: string, title: string) => ({ startsAt: jst(s), endsAt: jst(e), title });

/** セルを短い文字にする（booked は 'B:題名:span'） */
const short = (cells: ReturnType<typeof gridCells<{ title: string }>>) =>
  cells.map((c) => (c.kind === 'booked' ? `B:${c.booking.title}:${c.span}` : c.kind));

test('予約の無い日: 今より前の枠は past、それ以外は free', () => {
  const busy = markBusy<ReturnType<typeof book>>(slots, []);
  const cells = short(gridCells(slots, busy, jst('09:10')));
  assert.equal(cells.length, 26);
  assert.deepEqual(cells.slice(0, 4), ['past', 'past', 'past', 'free']); // 8:00・8:30・9:00 は始まっている
  assert.equal(cells.at(-1), 'free');
});

test('続く枠は1つの booked と covered。間が空けば別のセル', () => {
  const a = book('10:00', '11:30', '定例');
  const b = book('11:30', '12:00', '1on1');
  const c = book('13:00', '14:00', '定例');
  const cells = short(gridCells(slots, markBusy(slots, [a, b, c]), jst('07:00')));
  assert.deepEqual(cells.slice(4, 12), [
    'B:定例:3',
    'covered',
    'covered',
    'B:1on1:1',
    'free',
    'free',
    'B:定例:2',
    'covered',
  ]);
});

test('題名が同じでも別の予約なら、別のセル（=== で比べる）', () => {
  const cells = short(
    gridCells(slots, markBusy(slots, [book('10:00', '10:30', 'x'), book('10:30', '11:00', 'x')]), jst('07:00')),
  );
  assert.deepEqual(cells.slice(4, 6), ['B:x:1', 'B:x:1']);
});

test('始まった予約は過ぎても booked。最後の枠まで続く予約も数えられる', () => {
  const cells = short(
    gridCells(slots, markBusy(slots, [book('08:00', '09:00', '朝'), book('20:00', '21:00', '夜')]), jst('20:45')),
  );
  assert.deepEqual(cells.slice(0, 3), ['B:朝:2', 'covered', 'past']);
  assert.deepEqual(cells.slice(-2), ['B:夜:2', 'covered']);
});

test('型のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
