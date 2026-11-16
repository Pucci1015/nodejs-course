// @vitest-environment jsdom
// 第41章 練習問題2のテスト: npx vitest run TaskTable.test.tsx
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import type { Task } from './types.ts';
// 確かめるファイル。MODULE=../solutions/TaskTable.tsx で模範解答に替えられる
const mod: typeof import('./TaskTable.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './TaskTable.tsx', import.meta.url).pathname);
afterEach(cleanup);
const t = (id: number, title: string, status: Task['status'] = 'todo', dueDate: string | null = null): Task => ({ id, title, status, dueDate });
void within; void userEvent; void screen;
const { TaskTable } = mod;

test('見出し <h2> は「題名（n 件）」', () => {
  render(<TaskTable title="今日" tasks={[t(1, 'A'), t(2, 'B')]} />);
  expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('今日（2 件）');
});

test('タスクの題名を <ul> の <li> に並べる', () => {
  render(<TaskTable title="今日" tasks={[t(1, 'A'), t(2, 'B'), t(3, 'C')]} />);
  expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['A', 'B', 'C']);
});

test('空なら <ul> を出さず、「タスクはありません」', () => {
  render(<TaskTable title="明日" tasks={[]} />);
  expect(screen.getByRole('heading').textContent).toBe('明日（0 件）');
  expect(screen.queryByRole('list')).toBeNull();
  expect(screen.getByText('タスクはありません')).toBeTruthy();
});

test('key の警告が出ない（console.error が呼ばれない）', () => {
  const errors: unknown[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => errors.push(args);
  try {
    render(<TaskTable title="今日" tasks={[t(1, 'A'), t(2, 'B')]} />);
  } finally {
    console.error = original;
  }
  expect(errors).toEqual([]);
});
