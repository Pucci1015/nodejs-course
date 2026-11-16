// @vitest-environment jsdom
// 第48章 練習問題2のテスト: npx vitest run NavLink.test.tsx
import { cleanup, render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { afterEach, expect, test, vi } from 'vitest';
import { startsWithUseClient } from './check-use-client.ts';

// next/navigation を偽物にする。usePathname() が返す値を、テストごとに決められる
vi.mock('next/navigation', () => ({ usePathname: vi.fn() }));
const setPath = (p: string) => vi.mocked(usePathname).mockReturnValue(p);

// 確かめるファイル。MODULE=../solutions/components/NavLink.tsx で模範解答に替えられる
const path = new URL(process.env.MODULE ?? './components/NavLink.tsx', import.meta.url).pathname;
const mod: typeof import('./components/NavLink.tsx') = await import(/* @vite-ignore */ path);
afterEach(cleanup);
const { NavLink } = mod;
const link = (name: string) => screen.getByRole('link', { name });

test("ファイルの1行目が 'use client'", () => {
  expect(startsWithUseClient(path)).toBe(true);
});

test('href と文字を持つリンクになる', () => {
  setPath('/');
  render(<NavLink href="/about">このアプリについて</NavLink>);
  expect(link('このアプリについて').getAttribute('href')).toBe('/about');
});

test('今のページと同じなら aria-current="page"', () => {
  setPath('/about');
  render(<NavLink href="/about">このアプリについて</NavLink>);
  expect(link('このアプリについて').getAttribute('aria-current')).toBe('page');
});

test('違うページなら aria-current は付けない', () => {
  setPath('/');
  render(<NavLink href="/about">このアプリについて</NavLink>);
  expect(link('このアプリについて').hasAttribute('aria-current')).toBe(false);
});

test('/tasks のリンクは、/tasks/3 を開いているときも今のページ（下の階層）', () => {
  setPath('/tasks/3');
  render(
    <>
      <NavLink href="/tasks">タスク</NavLink>
      <NavLink href="/tasks-old">古いタスク</NavLink>
    </>,
  );
  expect(link('タスク').getAttribute('aria-current')).toBe('page');
  expect(link('古いタスク').hasAttribute('aria-current')).toBe(false);
});

test('/ のリンクは、/ を開いているときだけ今のページ', () => {
  setPath('/tasks');
  render(<NavLink href="/">ホーム</NavLink>);
  expect(link('ホーム').hasAttribute('aria-current')).toBe(false);
});
