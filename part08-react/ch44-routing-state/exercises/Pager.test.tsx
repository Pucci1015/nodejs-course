// @vitest-environment jsdom
// 第44章 練習問題5のテスト: npx vitest run Pager.test.tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/Pager.tsx で模範解答に替えられる
const mod: typeof import('./Pager.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './Pager.tsx', import.meta.url).pathname);
afterEach(cleanup);
const { Pager } = mod;

// 今の URL の ? から後ろを出す（テストで URL を確かめるため）
function Search() {
  return <output aria-label="URL">{useLocation().search}</output>;
}
const show = (url: string, hasNext = true) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Pager hasNext={hasNext} />
      <Search />
    </MemoryRouter>,
  );
const search = () => screen.getByLabelText('URL').textContent;
const button = (name: string) => screen.getByRole<HTMLButtonElement>('button', { name });

test('page が無ければ 1 ページ目で、「前へ」は押せない', () => {
  show('/');
  expect(screen.getByRole('navigation', { name: 'ページ' }).textContent).toContain('1 ページ目');
  expect(button('前へ').disabled).toBe(true);
  expect(button('次へ').disabled).toBe(false);
});

test('おかしな page は 1 ページ目', () => {
  show('/?page=abc');
  expect(screen.getByText(/ページ目/).textContent?.trim()).toBe('1 ページ目');
});

test('「次へ」で page が増え、ほかのパラメータは残る', async () => {
  show('/?status=done');
  await userEvent.click(button('次へ'));
  expect(search()).toBe('?status=done&page=2');
  await userEvent.click(button('次へ'));
  expect(search()).toBe('?status=done&page=3');
  expect(screen.getByText(/ページ目/).textContent?.trim()).toBe('3 ページ目');
});

test('1 ページ目に戻ると、page を URL から消す', async () => {
  show('/?page=2&q=a');
  await userEvent.click(button('前へ'));
  expect(search()).toBe('?q=a');
  expect(button('前へ').disabled).toBe(true);
});

test('hasNext が false なら、「次へ」は押せない', () => {
  show('/?page=4', false);
  expect(button('次へ').disabled).toBe(true);
});
