// 練習問題1 のテスト
// 使い方: node --test slot-round.test.ts
//   模範解答を試す: MODULE=../solutions/slot-round.ts node --test slot-round.test.ts
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './slot-round.ts');
const mod: typeof import('./slot-round.ts') = await import(pathToFileURL(file).href);
const { floorToSlot, ceilToSlot } = mod;

const jst = (hm: string) => new Date(`2026-12-10T${hm}+09:00`);

test('floorToSlot: 前の区切りへ。区切りちょうどは、そのまま', () => {
  assert.equal(floorToSlot(jst('10:17:00')).getTime(), jst('10:00:00').getTime());
  assert.equal(floorToSlot(jst('10:59:59.999')).getTime(), jst('10:30:00').getTime());
  assert.equal(floorToSlot(jst('10:30:00')).getTime(), jst('10:30:00').getTime());
});

test('ceilToSlot: 後の区切りへ。区切りちょうどは、そのまま', () => {
  assert.equal(ceilToSlot(jst('10:17:00')).getTime(), jst('10:30:00').getTime());
  assert.equal(ceilToSlot(jst('10:30:00.001')).getTime(), jst('11:00:00').getTime());
  assert.equal(ceilToSlot(jst('10:30:00')).getTime(), jst('10:30:00').getTime());
  assert.equal(ceilToSlot(jst('23:45:00')).getTime(), jst('00:00:00').getTime() + 24 * 3600_000); // 次の日へ
});

test('引数の Date を書き換えない（新しい Date を返す）', () => {
  const at = jst('10:17:00');
  const before = at.getTime();
  assert.notEqual(floorToSlot(at), at);
  ceilToSlot(at);
  assert.equal(at.getTime(), before);
});

test('tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
