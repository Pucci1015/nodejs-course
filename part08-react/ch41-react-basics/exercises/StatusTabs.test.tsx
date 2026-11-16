// @vitest-environment jsdom
// 第41章 練習問題3のテスト: npx vitest run StatusTabs.test.tsx
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import type { Task } from './types.ts';
// 確かめるファイル。MODULE=../solutions/StatusTabs.tsx で模範解答に替えられる
const mod: typeof import('./StatusTabs.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './StatusTabs.tsx', import.meta.url).pathname);
afterEach(cleanup);
const t = (id: number, title: string, status: Task['status'] = 'todo', dueDate: string | null = null): Task => ({ id, title, status, dueDate });
void within; void userEvent; void screen;
const { StatusTabs } = mod;

test('4つのボタン: すべて・未着手・作業中・完了', () => {
  render(<StatusTabs value="all" onChange={() => {}} />);
  expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['すべて', '未着手', '作業中', '完了']);
});

test('選ばれているボタンだけ aria-pressed="true"、ほかは "false"', () => {
  render(<StatusTabs value="doing" onChange={() => {}} />);
  expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true', 'false']);
});

test('押すと onChange に、その値を渡す', async () => {
  const seen: string[] = [];
  render(<StatusTabs value="all" onChange={(v) => seen.push(v)} />);
  await userEvent.click(screen.getByRole('button', { name: '完了' }));
  await userEvent.click(screen.getByRole('button', { name: 'すべて' }));
  expect(seen).toEqual(['done', 'all']);
});

test('ボタンは type="button"（フォームの中に置いても、送信しない）', () => {
  render(<StatusTabs value="all" onChange={() => {}} />);
  expect(screen.getAllByRole('button').every((b) => b.getAttribute('type') === 'button')).toBe(true);
});
