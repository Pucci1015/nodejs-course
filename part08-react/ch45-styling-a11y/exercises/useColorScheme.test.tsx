// @vitest-environment jsdom
// 第45章 練習問題7のテスト: npx vitest run useColorScheme.test.tsx
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
// 確かめるファイル。MODULE=../solutions/useColorScheme.ts で模範解答に替えられる
const mod: typeof import('./useColorScheme.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './useColorScheme.ts', import.meta.url).pathname);
const { useColorScheme } = mod;

// jsdom には matchMedia が無いので、OS の設定を変えられる偽物を作る
let dark = false;
const listeners = new Set<(e: { matches: boolean }) => void>();
beforeEach(() => {
  dark = false;
  listeners.clear();
  delete document.documentElement.dataset.theme;
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      media: query,
      get matches() {
        return dark;
      },
      addEventListener: (_type: string, fn: (e: { matches: boolean }) => void) => listeners.add(fn),
      removeEventListener: (_type: string, fn: (e: { matches: boolean }) => void) => listeners.delete(fn),
    })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function setOsDark(v: boolean) {
  dark = v;
  act(() => listeners.forEach((fn) => fn({ matches: v })));
}

test('light・dark を選べば、それを返し、<html data-theme> に入れる', () => {
  const { result, rerender } = renderHook(({ c }) => useColorScheme(c), { initialProps: { c: 'dark' as const } as { c: 'light' | 'dark' | 'system' } });
  expect(result.current).toBe('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
  rerender({ c: 'light' });
  expect(result.current).toBe('light');
  expect(document.documentElement.dataset.theme).toBe('light');
});

test('system なら、OS の設定（prefers-color-scheme）に合わせる', () => {
  dark = true;
  const { result } = renderHook(() => useColorScheme('system'));
  expect(result.current).toBe('dark');
  expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
});

test('system のとき、OS の設定が変わったら、合わせて変わる', () => {
  const { result } = renderHook(() => useColorScheme('system'));
  expect(result.current).toBe('light');
  setOsDark(true);
  expect(result.current).toBe('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
});

test('画面から消えたら、OS の設定を見張るのをやめる', () => {
  const { unmount } = renderHook(() => useColorScheme('system'));
  expect(listeners.size).toBe(1);
  unmount();
  expect(listeners.size).toBe(0);
});
