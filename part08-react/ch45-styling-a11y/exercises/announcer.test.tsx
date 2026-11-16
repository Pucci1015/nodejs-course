// @vitest-environment jsdom
// 第45章 練習問題5のテスト: npx vitest run announcer.test.tsx
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
// 確かめるファイル。MODULE=../solutions/announcer.tsx で模範解答に替えられる
const mod: typeof import('./announcer.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './announcer.tsx', import.meta.url).pathname);
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const { AnnouncerProvider, useAnnounce } = mod;

function AddButton() {
  const announce = useAnnounce();
  return (
    <button type="button" onClick={() => announce('「牛乳を買う」を追加しました')}>
      追加
    </button>
  );
}

test('知らせる場所は、最初から空で置いてある（role="status"・aria-live="polite"）', () => {
  render(
    <AnnouncerProvider>
      <p>中身</p>
    </AnnouncerProvider>,
  );
  const region = screen.getByRole('status');
  expect(region.getAttribute('aria-live')).toBe('polite');
  expect(region.textContent).toBe('');
  expect(screen.getByText('中身')).toBeTruthy();
});

test('announce した文が入り、5秒たつと消える', () => {
  render(
    <AnnouncerProvider>
      <AddButton />
    </AnnouncerProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: '追加' }));
  expect(screen.getByRole('status').textContent).toBe('「牛乳を買う」を追加しました');
  act(() => vi.advanceTimersByTime(4999));
  expect(screen.getByRole('status').textContent).toBe('「牛乳を買う」を追加しました');
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByRole('status').textContent).toBe('');
});

test('続けて知らせると、最後の文から数え直す（clearAfterMs で時間を変えられる）', () => {
  function Two() {
    const announce = useAnnounce();
    return (
      <>
        <button type="button" onClick={() => announce('1つ目')}>1</button>
        <button type="button" onClick={() => announce('2つ目')}>2</button>
      </>
    );
  }
  render(
    <AnnouncerProvider clearAfterMs={1000}>
      <Two />
    </AnnouncerProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: '1' }));
  act(() => vi.advanceTimersByTime(800));
  fireEvent.click(screen.getByRole('button', { name: '2' }));
  act(() => vi.advanceTimersByTime(800));
  expect(screen.getByRole('status').textContent).toBe('2つ目');
  act(() => vi.advanceTimersByTime(200));
  expect(screen.getByRole('status').textContent).toBe('');
});

test('Provider の外で useAnnounce を使うと、例外', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => renderHook(() => useAnnounce())).toThrow('useAnnounce は <AnnouncerProvider> の中で使ってください');
  spy.mockRestore();
});
