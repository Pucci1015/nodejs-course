// @vitest-environment jsdom
// 第39章 練習問題2のテスト: npx vitest run task-list.test.js
import { expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/task-list.js で模範解答に替えられる
const mod = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './task-list.js', import.meta.url).pathname);
const { renderList, countByStatus } = mod;

const tasks = [
  { id: 1, title: 'A', status: 'todo' },
  { id: 2, title: 'B', status: 'done' },
  { id: 3, title: 'C', status: 'todo' },
];

test('タスクの数だけ <li> を作り、数を返す', () => {
  const ul = document.createElement('ul');
  expect(renderList(ul, tasks)).toBe(3);
  expect([...ul.children].map((li) => li.textContent)).toEqual(['A', 'B', 'C']);
  expect([...ul.children].map((li) => li.dataset.id)).toEqual(['1', '2', '3']);
});

test('前の中身は消して、置き換える', () => {
  const ul = document.createElement('ul');
  renderList(ul, tasks);
  renderList(ul, [tasks[0]]);
  expect(ul.children.length).toBe(1);
});

test('空なら「タスクはありません」の <li class="empty"> を1つ。数は 0', () => {
  const ul = document.createElement('ul');
  expect(renderList(ul, [])).toBe(0);
  expect(ul.children.length).toBe(1);
  expect(ul.firstElementChild.className).toBe('empty');
  expect(ul.textContent).toBe('タスクはありません');
});

test('countByStatus: 状態ごとの数。無い状態は 0', () => {
  expect(countByStatus(tasks)).toEqual({ todo: 2, doing: 0, done: 1 });
  expect(countByStatus([])).toEqual({ todo: 0, doing: 0, done: 0 });
});
