// @vitest-environment jsdom
// 第48章 練習問題1のテスト: npx vitest run LikeButton.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { startsWithUseClient } from './check-use-client.ts';
// 確かめるファイル。MODULE=../solutions/components/LikeButton.tsx で模範解答に替えられる
const path = new URL(process.env.MODULE ?? './components/LikeButton.tsx', import.meta.url).pathname;
const mod: typeof import('./components/LikeButton.tsx') = await import(/* @vite-ignore */ path);
afterEach(cleanup);
const { LikeButton } = mod;

test("ファイルの1行目が 'use client'", () => {
  expect(startsWithUseClient(path)).toBe(true);
});

test('最初は「いいね 0」', () => {
  render(<LikeButton />);
  expect(screen.getByRole('button').textContent).toBe('いいね 0');
});

test('押すたびに1つ増える', () => {
  render(<LikeButton />);
  const button = screen.getByRole('button');
  fireEvent.click(button);
  fireEvent.click(button);
  fireEvent.click(button);
  expect(button.textContent).toBe('いいね 3');
});
