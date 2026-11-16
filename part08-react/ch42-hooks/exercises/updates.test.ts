// 第42章 練習問題3のテスト: npx vitest run updates.test.ts
import { expect, test } from 'vitest';
import type { Task } from './updates.ts';
// 確かめるファイル。MODULE=../solutions/updates.ts で模範解答に替えられる
const mod: typeof import('./updates.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './updates.ts', import.meta.url).pathname);
const { toggle, rename, remove, moveUp } = mod;

// 配列も中のオブジェクトも凍らせる（変えようとすると例外になる）
const make = (): readonly Task[] =>
  Object.freeze([
    Object.freeze({ id: 1, title: '牛乳を買う', done: false }),
    Object.freeze({ id: 2, title: '本を返す', done: true }),
    Object.freeze({ id: 3, title: '掃除', done: false }),
  ]);

test('toggle: その id の done を反対にする', () => {
  const tasks = make();
  const next = toggle(tasks, 2);
  expect(next.map((t) => t.done)).toEqual([false, false, false]);
  expect(next).not.toBe(tasks);
  expect(next[1]).not.toBe(tasks[1]);
  // 変えなかったタスクは、同じオブジェクトのまま
  expect(next[0]).toBe(tasks[0]);
});

test('rename: その id の題名を変える', () => {
  const tasks = make();
  const next = rename(tasks, 3, '風呂掃除');
  expect(next.map((t) => t.title)).toEqual(['牛乳を買う', '本を返す', '風呂掃除']);
  expect(next[0]).toBe(tasks[0]);
  expect(tasks[2]!.title).toBe('掃除');
});

test('remove: その id を除く', () => {
  const tasks = make();
  expect(remove(tasks, 1).map((t) => t.id)).toEqual([2, 3]);
  expect(remove(tasks, 9).map((t) => t.id)).toEqual([1, 2, 3]);
  expect(tasks).toHaveLength(3);
});

test('moveUp: 1つ前と入れ替える', () => {
  const tasks = make();
  const next = moveUp(tasks, 3);
  expect(next.map((t) => t.id)).toEqual([1, 3, 2]);
  expect(next[1]).toBe(tasks[2]);
  expect(tasks.map((t) => t.id)).toEqual([1, 2, 3]);
});

test('moveUp: 先頭や、無い id なら、並びは変わらない（新しい配列を返す）', () => {
  const tasks = make();
  const a = moveUp(tasks, 1);
  expect(a.map((t) => t.id)).toEqual([1, 2, 3]);
  expect(a).not.toBe(tasks);
  expect(moveUp(tasks, 9).map((t) => t.id)).toEqual([1, 2, 3]);
});
