// @vitest-environment jsdom
// 第48章 練習問題6のテスト: npx vitest run StatusFilter.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { usePathname, useRouter, useSearchParams, type ReadonlyURLSearchParams } from 'next/navigation';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { startsWithUseClient } from './check-use-client.ts';

// next/navigation を偽物にする。今の URL を、テストごとに決められる
vi.mock('next/navigation', () => ({ usePathname: vi.fn(), useRouter: vi.fn(), useSearchParams: vi.fn() }));
const replace = vi.fn();
const push = vi.fn();
function openAt(url: string) {
  const u = new URL(url, 'http://localhost');
  vi.mocked(usePathname).mockReturnValue(u.pathname);
  vi.mocked(useSearchParams).mockReturnValue(u.searchParams as ReadonlyURLSearchParams);
}
beforeEach(() => {
  replace.mockReset();
  push.mockReset();
  // 使う関数だけを持つ偽物（型は本物の router のふりをさせる）
  vi.mocked(useRouter).mockReturnValue({ replace, push, refresh: vi.fn() } as unknown as ReturnType<typeof useRouter>);
});

// 確かめるファイル。MODULE=../solutions/components/StatusFilter.tsx で模範解答に替えられる
const path = new URL(process.env.MODULE ?? './components/StatusFilter.tsx', import.meta.url).pathname;
const mod: typeof import('./components/StatusFilter.tsx') = await import(/* @vite-ignore */ path);
afterEach(cleanup);
const { StatusFilter } = mod;
const select = () => screen.getByRole<HTMLSelectElement>('combobox', { name: '状態' });
// 最後に replace した URL（末尾の ? は取る）
const lastUrl = () => String(replace.mock.lastCall?.[0] ?? '').replace(/\?$/, '');

test("ファイルの1行目が 'use client'", () => {
  expect(startsWithUseClient(path)).toBe(true);
});

test('「状態」という名前の選択欄に、4つの選択肢がある', () => {
  openAt('/tasks');
  render(<StatusFilter />);
  const options = [...select().options].map((o) => [o.value, o.textContent]);
  expect(options).toEqual([
    ['', 'すべて'],
    ['todo', '未着手'],
    ['doing', '作業中'],
    ['done', '完了'],
  ]);
});

test('最初に選ばれているのは、URL の ?status= のもの', () => {
  openAt('/tasks?status=doing');
  render(<StatusFilter />);
  expect(select().value).toBe('doing');
});

test('?status= が無ければ「すべて」', () => {
  openAt('/tasks');
  render(<StatusFilter />);
  expect(select().value).toBe('');
});

test('選ぶと、router.replace で ?status= を変える', () => {
  openAt('/tasks');
  render(<StatusFilter />);
  fireEvent.change(select(), { target: { value: 'done' } });
  expect(replace).toHaveBeenCalledTimes(1);
  expect(lastUrl()).toBe('/tasks?status=done');
  expect(push).not.toHaveBeenCalled();
});

test('ほかのパラメータ（?q=）は残す', () => {
  openAt('/tasks?q=%E6%9C%AC&status=todo');
  render(<StatusFilter />);
  fireEvent.change(select(), { target: { value: 'doing' } });
  const u = new URL(lastUrl(), 'http://localhost');
  expect(u.pathname).toBe('/tasks');
  expect(u.searchParams.get('q')).toBe('本');
  expect(u.searchParams.get('status')).toBe('doing');
});

test('「すべて」を選ぶと、?status= を消す', () => {
  openAt('/tasks?status=todo');
  render(<StatusFilter />);
  fireEvent.change(select(), { target: { value: '' } });
  expect(lastUrl()).toBe('/tasks');
});
