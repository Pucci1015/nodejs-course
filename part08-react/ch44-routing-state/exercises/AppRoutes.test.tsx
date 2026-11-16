// @vitest-environment jsdom
// 第44章 練習問題7のテスト: npx vitest run AppRoutes.test.tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/AppRoutes.tsx で模範解答に替えられる
const mod: typeof import('./AppRoutes.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './AppRoutes.tsx', import.meta.url).pathname);
afterEach(cleanup);
const { AppRoutes } = mod;

function Path() {
  return <output aria-label="URL">{useLocation().pathname}</output>;
}
const show = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <AppRoutes />
      <Path />
    </MemoryRouter>,
  );
const h1 = () => screen.getByRole('heading', { level: 1 }).textContent;

test.each([
  ['/', 'ホーム'],
  ['/tasks', 'タスクの一覧'],
  ['/tasks/new', '新しいタスク'],
  ['/tasks/42', 'タスク 42'],
  ['/nope', 'ページが見つかりません'],
  ['/tasks/1/x', 'ページが見つかりません'],
])('%s は「%s」', (url, heading) => {
  show(url);
  expect(h1()).toBe(heading);
});

test('どのページにも Layout のメニューが出る', () => {
  show('/tasks/42');
  expect(screen.getByRole('navigation')).toBeTruthy();
  cleanup();
  show('/nope');
  expect(screen.getByRole('navigation')).toBeTruthy();
});

test('/home は / に移す（履歴に /home を残さない）', () => {
  show('/home');
  expect(h1()).toBe('ホーム');
  expect(screen.getByLabelText('URL').textContent).toBe('/');
});

test('メニューのリンクで移れる', async () => {
  show('/');
  await userEvent.click(screen.getByRole('link', { name: 'タスク' }));
  expect(h1()).toBe('タスクの一覧');
  await userEvent.click(screen.getByRole('link', { name: '新しいタスク' }));
  expect(h1()).toBe('新しいタスク');
});
