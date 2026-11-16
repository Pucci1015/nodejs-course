// @vitest-environment jsdom
// 第42章 練習問題1のテスト: npx vitest run Score.test.tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { afterEach, expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/Score.tsx で模範解答に替えられる
const mod: typeof import('./Score.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './Score.tsx', import.meta.url).pathname);
afterEach(cleanup);
const { Score } = mod;
const heading = () => screen.getByRole('heading').textContent;
const items = () => screen.queryAllByRole('listitem').map((li) => li.textContent);
const click = (name: string) => userEvent.click(screen.getByRole('button', { name }));

test('最初は 0 点で、履歴は空', () => {
  render(<Score />);
  expect(heading()).toBe('得点: 0');
  expect(items()).toEqual([]);
});

test('+1 を2回押すと 2 点', async () => {
  render(<Score />);
  await click('+1');
  await click('+1');
  expect(heading()).toBe('得点: 2');
});

test('+3 で 3 点増え、履歴に +1 が3つ並ぶ', async () => {
  render(
    <StrictMode>
      <Score />
    </StrictMode>,
  );
  await click('+3');
  expect(heading()).toBe('得点: 3');
  await click('+1');
  expect(heading()).toBe('得点: 4');
  expect(items()).toEqual(['+1', '+1', '+1', '+1']);
});

test('0に戻す で 0 点になり、履歴に残る', async () => {
  render(<Score />);
  await click('+3');
  await click('0に戻す');
  expect(heading()).toBe('得点: 0');
  expect(items()).toEqual(['+1', '+1', '+1', '0に戻す']);
});
