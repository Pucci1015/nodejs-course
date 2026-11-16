// @vitest-environment jsdom
// 第44章 練習問題2のテスト: npx vitest run Nav.test.tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/Nav.tsx で模範解答に替えられる
const mod: typeof import('./Nav.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './Nav.tsx', import.meta.url).pathname);
afterEach(cleanup);
const { Nav } = mod;
const items = [
  { to: '/', label: '一覧' },
  { to: '/tasks/new', label: '新しいタスク' },
  { to: '/about', label: 'この画面について' },
];
// テストでは、ブラウザの URL のかわりに、メモリの中の URL を使う（本文8節）
const show = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Nav items={items} />
    </MemoryRouter>,
  );
const current = () => screen.queryAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page').map((a) => a.textContent);

test('「メニュー」という名前の nav の中に、リンクを順に並べる', () => {
  show('/');
  const nav = screen.getByRole('navigation', { name: 'メニュー' });
  expect(nav).toBeTruthy();
  expect(screen.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
    ['一覧', '/'],
    ['新しいタスク', '/tasks/new'],
    ['この画面について', '/about'],
  ]);
});

test('今のページのリンクにだけ aria-current="page" と class="active"', () => {
  show('/about');
  expect(current()).toEqual(['この画面について']);
  expect(screen.getByRole('link', { name: 'この画面について' }).className).toBe('active');
  expect(screen.getByRole('link', { name: '一覧' }).className).toBe('');
});

test('/ のリンクは、/ ぴったりのときだけ', () => {
  show('/tasks/new');
  expect(current()).toEqual(['新しいタスク']);
  cleanup();
  show('/');
  expect(current()).toEqual(['一覧']);
});

test('押すと、今のページが変わる', async () => {
  show('/');
  await userEvent.click(screen.getByRole('link', { name: '新しいタスク' }));
  expect(current()).toEqual(['新しいタスク']);
});
