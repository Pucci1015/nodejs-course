// @vitest-environment jsdom
// 第42章 練習問題5のテスト: npx vitest run Stopwatch.test.tsx
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
// 確かめるファイル。MODULE=../solutions/Stopwatch.tsx で模範解答に替えられる
const mod: typeof import('./Stopwatch.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './Stopwatch.tsx', import.meta.url).pathname);
// 偽物の時計を使う（本文9節）
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const { Stopwatch } = mod;
const shown = () => screen.getByText(/経過/).textContent;
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));
// StrictMode で描く（後片付けを忘れると、タイマーが2つ動いて2倍の速さで進む）
const show = () =>
  render(
    <StrictMode>
      <Stopwatch />
    </StrictMode>,
  );

test('最初は 0 秒で、開始ボタンがある', () => {
  show();
  expect(shown()).toBe('経過: 0 秒');
  expect(screen.getByRole('button', { name: '開始' })).toBeTruthy();
  wait(3000);
  expect(shown()).toBe('経過: 0 秒');
});

test('開始すると1秒に1つ進み、ボタンは「停止」になる', () => {
  show();
  click('開始');
  wait(3000);
  expect(shown()).toBe('経過: 3 秒');
  expect(screen.getByRole('button', { name: '停止' })).toBeTruthy();
});

test('停止すると止まり、もう一度開始すると続きから進む', () => {
  show();
  click('開始');
  wait(2000);
  click('停止');
  wait(5000);
  expect(shown()).toBe('経過: 2 秒');
  click('開始');
  wait(1000);
  expect(shown()).toBe('経過: 3 秒');
});

test('リセットで 0 秒に戻り、止まる', () => {
  show();
  click('開始');
  wait(4000);
  click('リセット');
  expect(shown()).toBe('経過: 0 秒');
  wait(3000);
  expect(shown()).toBe('経過: 0 秒');
  expect(screen.getByRole('button', { name: '開始' })).toBeTruthy();
});

test('動いている途中で画面から消えると、タイマーも止まる', () => {
  const { unmount } = show();
  click('開始');
  wait(1000);
  unmount();
  // 残っているタイマーの数
  expect(vi.getTimerCount()).toBe(0);
});
