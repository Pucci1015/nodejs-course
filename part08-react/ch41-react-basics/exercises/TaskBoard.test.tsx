// @vitest-environment jsdom
// 第41章 練習問題7のテスト: npx vitest run TaskBoard.test.tsx
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import type { Task } from './types.ts';
// 確かめるファイル。MODULE=../solutions/TaskBoard.tsx で模範解答に替えられる
const mod: typeof import('./TaskBoard.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './TaskBoard.tsx', import.meta.url).pathname);
afterEach(cleanup);
const t = (id: number, title: string, status: Task['status'] = 'todo', dueDate: string | null = null): Task => ({ id, title, status, dueDate });
void within; void userEvent; void screen;
const { TaskBoard } = mod;
const items = () => screen.getAllByRole('listitem').map((li) => li.querySelector('label')?.textContent);
const left = () => screen.getByText(/^残り/).textContent;

test('最初のタスクを並べ、「残り n 件」は done 以外の数', () => {
  render(<TaskBoard initialTasks={[t(1, 'A'), t(2, 'B', 'done'), t(3, 'C', 'doing')]} />);
  expect(items()).toEqual(['A', 'B', 'C']);
  expect(left()).toBe('残り 2 件');
});

test('追加すると後ろに足され、入力は空になる。空白だけなら足さない', async () => {
  render(<TaskBoard initialTasks={[t(1, 'A')]} />);
  const input = screen.getByLabelText<HTMLInputElement>('新しいタスク');
  await userEvent.type(input, ' B {Enter}');
  expect(input.value).toBe('');
  await userEvent.type(input, '   {Enter}');
  expect(items()).toEqual(['A', 'B']);
  expect(left()).toBe('残り 2 件');
});

test('チェックで done と todo を切り替える', async () => {
  render(<TaskBoard initialTasks={[t(1, 'A'), t(2, 'B')]} />);
  const box = screen.getByRole<HTMLInputElement>('checkbox', { name: 'A' });
  await userEvent.click(box);
  expect(box.checked).toBe(true);
  expect(left()).toBe('残り 1 件');
  await userEvent.click(box);
  expect(left()).toBe('残り 2 件');
});

test('「A を削除」のボタンで消える', async () => {
  render(<TaskBoard initialTasks={[t(1, 'A'), t(2, 'B')]} />);
  await userEvent.click(screen.getByRole('button', { name: 'Aを削除' }));
  expect(items()).toEqual(['B']);
});

test('initialTasks の配列は書き換えない', async () => {
  const initial = [t(1, 'A')];
  render(<TaskBoard initialTasks={initial} />);
  await userEvent.click(screen.getByRole('checkbox', { name: 'A' }));
  await userEvent.type(screen.getByLabelText('新しいタスク'), 'B{Enter}');
  expect(initial).toEqual([t(1, 'A')]);
});
