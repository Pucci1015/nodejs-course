// 第46章 練習問題7のテスト: npx vitest run dueLabel.test.ts
import { expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/dueLabel.ts で模範解答に替えられる
const mod: typeof import('./dueLabel.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './dueLabel.ts', import.meta.url).pathname);
const { todayIn, dueLabel } = mod;

test('todayIn: そのタイムゾーンでの日付', () => {
  // UTC の 11/11 16:00 は、日本では 11/12 の 1:00
  const now = new Date('2026-11-11T16:00:00Z');
  expect(todayIn('Asia/Tokyo', now)).toBe('2026-11-12');
  expect(todayIn('UTC', now)).toBe('2026-11-11');
  expect(todayIn('America/Los_Angeles', now)).toBe('2026-11-11');
});

test('todayIn: 年末', () => {
  expect(todayIn('Asia/Tokyo', new Date('2026-12-31T15:00:00Z'))).toBe('2027-01-01');
});

test.each([
  [null, '締め切りなし'],
  ['2026-11-12', '今日まで'],
  ['2026-11-13', '明日まで'],
  ['2026-11-20', 'あと 8 日'],
  ['2026-11-11', '1 日過ぎています'],
  ['2026-10-12', '31 日過ぎています'],
  ['2027-01-01', 'あと 50 日'],
])('dueLabel(%s, 2026-11-12) は「%s」', (due, label) => {
  expect(dueLabel(due, '2026-11-12')).toBe(label);
});

test('dueLabel: 夏時間のあるところでも、日の数がずれない（日付だけで数える）', () => {
  expect(dueLabel('2026-11-02', '2026-10-31')).toBe('あと 2 日');
  expect(dueLabel('2026-03-09', '2026-03-07')).toBe('あと 2 日');
});
