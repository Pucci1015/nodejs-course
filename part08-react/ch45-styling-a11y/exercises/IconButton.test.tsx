// @vitest-environment jsdom
// 第45章 練習問題2のテスト: npx vitest run IconButton.test.tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
// 確かめるファイル。MODULE=../solutions/IconButton.tsx で模範解答に替えられる
const mod: typeof import('./IconButton.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './IconButton.tsx', import.meta.url).pathname);
afterEach(cleanup);
const { IconButton } = mod;

test('名前は label。アイコンは読み上げない', () => {
  render(<IconButton icon="🗑" label="「牛乳を買う」を削除" onClick={() => {}} />);
  const button = screen.getByRole('button', { name: '「牛乳を買う」を削除' });
  expect(button.getAttribute('type')).toBe('button');
  const icon = button.querySelector('[aria-hidden="true"]');
  expect(icon?.textContent).toBe('🗑');
  // マウスを乗せたときにも、名前が出る
  expect(button.getAttribute('title')).toBe('「牛乳を買う」を削除');
});

test('押すと onClick。disabled なら押せない', async () => {
  const onClick = vi.fn();
  render(
    <>
      <IconButton icon="★" label="印を付ける" onClick={onClick} />
      <IconButton icon="×" label="閉じる" onClick={onClick} disabled />
    </>,
  );
  await userEvent.click(screen.getByRole('button', { name: '印を付ける' }));
  await userEvent.click(screen.getByRole('button', { name: '閉じる' }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('pressed を渡したときだけ aria-pressed を付ける', () => {
  render(
    <>
      <IconButton icon="★" label="A" onClick={() => {}} pressed />
      <IconButton icon="★" label="B" onClick={() => {}} pressed={false} />
      <IconButton icon="★" label="C" onClick={() => {}} />
    </>,
  );
  expect(screen.getByRole('button', { name: 'A' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('button', { name: 'B' }).getAttribute('aria-pressed')).toBe('false');
  expect(screen.getByRole('button', { name: 'C' }).hasAttribute('aria-pressed')).toBe(false);
});
