// @vitest-environment jsdom
// 第41章 練習問題8のテスト: npx vitest run SortableTable.test.tsx
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import type { Task } from './types.ts';
// 確かめるファイル。MODULE=../solutions/SortableTable.tsx で模範解答に替えられる
const mod: typeof import('./SortableTable.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './SortableTable.tsx', import.meta.url).pathname);
afterEach(cleanup);
const t = (id: number, title: string, status: Task['status'] = 'todo', dueDate: string | null = null): Task => ({ id, title, status, dueDate });
void within; void userEvent; void screen;
const { SortableTable, sortTasks } = mod;
const tasks = [t(1, 'C', 'todo', '2026-11-03'), t(2, 'A', 'todo', null), t(3, 'B', 'todo', '2026-11-01'), t(4, 'A', 'todo', '2026-11-02')];
const rows = () => screen.getAllByRole('row').slice(1).map((r) => [...r.querySelectorAll('td')].map((td) => td.textContent).join(' '));

test('sortTasks: 題名の小さい順。同じなら id の順。元の配列は変えない', () => {
  const copy = [...tasks];
  expect(sortTasks(tasks, { key: 'title', dir: 'asc' }).map((x) => x.id)).toEqual([2, 4, 3, 1]);
  expect(tasks).toEqual(copy);
});

test('sortTasks: 締め切りの null は、小さい順でも大きい順でも最後', () => {
  expect(sortTasks(tasks, { key: 'dueDate', dir: 'asc' }).map((x) => x.id)).toEqual([3, 4, 1, 2]);
  expect(sortTasks(tasks, { key: 'dueDate', dir: 'desc' }).map((x) => x.id)).toEqual([1, 4, 3, 2]);
});

test('最初は題名の小さい順。締め切りが null の行は「—」', () => {
  render(<SortableTable tasks={tasks} />);
  expect(rows()).toEqual(['A —', 'A 2026-11-02', 'B 2026-11-01', 'C 2026-11-03']);
});

test('見出しを押すとその列の小さい順、もう1回で大きい順。印は ▲ と ▼、aria-sort も変わる', async () => {
  render(<SortableTable tasks={tasks} />);
  const due = screen.getByRole('button', { name: /締め切り/ });
  await userEvent.click(due);
  expect(rows()).toEqual(['B 2026-11-01', 'A 2026-11-02', 'C 2026-11-03', 'A —']);
  expect(due.textContent).toBe('締め切り ▲');
  expect(due.closest('th')?.getAttribute('aria-sort')).toBe('ascending');
  await userEvent.click(due);
  expect(rows()).toEqual(['C 2026-11-03', 'A 2026-11-02', 'B 2026-11-01', 'A —']);
  expect(due.textContent).toBe('締め切り ▼');
  expect(screen.getByRole('button', { name: /題名/ }).closest('th')?.getAttribute('aria-sort')).toBe('none');
});
