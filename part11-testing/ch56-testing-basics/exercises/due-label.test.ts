// 練習問題2 のテスト
// 使い方: node --test due-label.test.ts
//   模範解答を試す: MODULE=../solutions/due-label.ts node --test due-label.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './due-label.ts');
const mod: Record<string, unknown> = await import(pathToFileURL(file).href);
// 書き直す前は引数が1つなので、ここでは型を決めずに呼ぶ
const dueLabel = mod['dueLabel'] as (due: string | null, now: Date) => string;

// 日本時間 2026-12-10 の 9 時
const now = new Date('2026-12-10T00:00:00Z');

const cases: [string | null, string][] = [
  [null, '期限なし'],
  ['2026-12-10', '今日まで'],
  ['2026-12-11', '明日まで'],
  ['2026-12-12', 'あと 2 日'],
  ['2026-12-16', 'あと 6 日'],
  ['2026-12-17', '12月17日まで'],
  ['2027-01-05', '1月5日まで'],
  ['2026-12-09', '1 日過ぎ'],
  ['2026-11-30', '10 日過ぎ'],
];
for (const [due, expected] of cases) {
  test(`${due} → ${expected}`, () => {
    assert.equal(dueLabel(due, now), expected);
  });
}

test('「今日」は日本時間で決める（UTC の 12-09 15:00 は、日本時間の 12-10 0:00）', () => {
  assert.equal(dueLabel('2026-12-10', new Date('2026-12-09T15:00:00Z')), '今日まで');
  assert.equal(dueLabel('2026-12-10', new Date('2026-12-09T14:59:59Z')), '明日まで');
});

test('型: 2つ目の引数に Date を受け取る', () => {
  assert.equal(dueLabel.length, 2, 'dueLabel(due, now) の形にしてください');
  assert.deepEqual(typeErrors([file]), []);
});
