// @vitest-environment jsdom
// 第43章 練習問題2のテスト: npx vitest run TaskListView.test.tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import type { Task } from './schemas.ts';
// 確かめるファイル。MODULE=../solutions/TaskListView.tsx で模範解答に替えられる
const mod: typeof import('./TaskListView.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './TaskListView.tsx', import.meta.url).pathname);
afterEach(cleanup);
const { TaskListView } = mod;
const t = (id: number, title: string): Task => ({ id, title, status: 'todo', dueDate: null, version: 1 });

test('pending: 「読み込み中…」を role="status" で出す', () => {
  render(<TaskListView load={{ status: 'pending' }} onRetry={() => {}} />);
  expect(screen.getByRole('status').textContent).toBe('読み込み中…');
  expect(screen.queryByRole('list')).toBeNull();
});

test('error: 文を role="alert" で出し、「再試行」で onRetry を呼ぶ', async () => {
  const onRetry = vi.fn();
  render(<TaskListView load={{ status: 'error', error: new Error('HTTP 500') }} onRetry={onRetry} />);
  expect(screen.getByRole('alert').textContent).toContain('読み込めませんでした: HTTP 500');
  await userEvent.click(screen.getByRole('button', { name: '再試行' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

test('success: 題名を並べる', () => {
  render(<TaskListView load={{ status: 'success', tasks: [t(1, '牛乳を買う'), t(2, '本を返す')] }} onRetry={() => {}} />);
  expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['牛乳を買う', '本を返す']);
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.queryByRole('alert')).toBeNull();
});

test('success で空なら「タスクはありません」', () => {
  render(<TaskListView load={{ status: 'success', tasks: [] }} onRetry={() => {}} />);
  expect(screen.getByText('タスクはありません')).toBeTruthy();
  expect(screen.queryByRole('list')).toBeNull();
});
