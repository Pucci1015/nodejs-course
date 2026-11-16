// @vitest-environment jsdom
// 第42章 練習問題6のテスト: npx vitest run useLocalStorage.test.tsx
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/useLocalStorage.ts で模範解答に替えられる
const mod: typeof import('./useLocalStorage.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './useLocalStorage.ts', import.meta.url).pathname);
afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
});
const { useLocalStorage } = mod;

test('保存された値が無ければ、initial を返す', () => {
  const { result } = renderHook(() => useLocalStorage('filter', 'all'));
  expect(result.current[0]).toBe('all');
});

test('保存された値があれば、それを返す（JSON として読む）', () => {
  localStorage.setItem('ids', JSON.stringify([1, 2]));
  const { result } = renderHook(() => useLocalStorage<number[]>('ids', []));
  expect(result.current[0]).toEqual([1, 2]);
});

test('値を変えると、画面の値も保存された値も変わる', () => {
  const { result } = renderHook(() => useLocalStorage('filter', 'all'));
  act(() => result.current[1]('done'));
  expect(result.current[0]).toBe('done');
  expect(localStorage.getItem('filter')).toBe('"done"');
});

test('更新関数も渡せる（続けて呼んでも正しく足される）', () => {
  const { result } = renderHook(() => useLocalStorage('count', 0));
  act(() => {
    result.current[1]((n) => n + 1);
    result.current[1]((n) => n + 1);
  });
  expect(result.current[0]).toBe(2);
  expect(localStorage.getItem('count')).toBe('2');
});

test('保存された文字が JSON として読めなければ、initial を返す', () => {
  localStorage.setItem('filter', '{こわれた');
  const { result } = renderHook(() => useLocalStorage('filter', 'all'));
  expect(result.current[0]).toBe('all');
});
