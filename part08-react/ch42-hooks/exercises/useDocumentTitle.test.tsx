// @vitest-environment jsdom
// 第42章 練習問題2のテスト: npx vitest run useDocumentTitle.test.tsx
import { cleanup, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/useDocumentTitle.ts で模範解答に替えられる
const mod: typeof import('./useDocumentTitle.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './useDocumentTitle.ts', import.meta.url).pathname);
afterEach(cleanup);
beforeEach(() => {
  document.title = '元の題名';
});
const { useDocumentTitle } = mod;

test('題名を変える', () => {
  renderHook(() => useDocumentTitle('タスク（3件）'));
  expect(document.title).toBe('タスク（3件）');
});

test('引数が変わると、題名も変わる', () => {
  const { rerender } = renderHook(({ title }) => useDocumentTitle(title), { initialProps: { title: 'A' } });
  expect(document.title).toBe('A');
  rerender({ title: 'B' });
  expect(document.title).toBe('B');
});

test('画面から消えると、元の題名に戻す', () => {
  const { rerender, unmount } = renderHook(({ title }) => useDocumentTitle(title), { initialProps: { title: 'A' } });
  rerender({ title: 'B' });
  unmount();
  expect(document.title).toBe('元の題名');
});

test('StrictMode でも正しく動く', () => {
  const { unmount } = renderHook(() => useDocumentTitle('C'), { wrapper: StrictMode });
  expect(document.title).toBe('C');
  unmount();
  expect(document.title).toBe('元の題名');
});
