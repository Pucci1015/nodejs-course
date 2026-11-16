// @vitest-environment jsdom
// 第42章 練習問題8のテスト: npx vitest run TaskSearch.test.tsx
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
// 確かめるファイル。MODULE=../solutions/TaskSearch.tsx で模範解答に替えられる
const mod: typeof import('./TaskSearch.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './TaskSearch.tsx', import.meta.url).pathname);
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const { useDebounce, TaskSearch } = mod;
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('useDebounce', () => {
  test('値が ms の間変わらなかったときに、新しい値を返す', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), { initialProps: { v: 'a' } });
    expect(result.current).toBe('a');
    rerender({ v: 'ab' });
    wait(200);
    rerender({ v: 'abc' });
    wait(200);
    // 'abc' になってから、まだ 200ms
    expect(result.current).toBe('a');
    wait(100);
    expect(result.current).toBe('abc');
  });
});

describe('TaskSearch', () => {
  const tasks = [
    { id: 1, title: '牛乳を買う' },
    { id: 2, title: 'Report を書く' },
    { id: 3, title: '牛肉を買う' },
  ];
  const show = () =>
    render(
      <StrictMode>
        <TaskSearch tasks={tasks} />
      </StrictMode>,
    );
  const input = () => screen.getByLabelText<HTMLInputElement>('検索');
  const titles = () => screen.queryAllByRole('listitem').map((li) => li.textContent);

  test('最初は全部と件数を出す', () => {
    show();
    expect(titles()).toHaveLength(3);
    expect(screen.getByText('3 件')).toBeTruthy();
  });

  test('打って 300ms たってから絞り込む（大文字と小文字は区別しない）', () => {
    show();
    fireEvent.change(input(), { target: { value: '牛' } });
    wait(299);
    expect(titles()).toHaveLength(3);
    wait(1);
    expect(titles()).toEqual(['牛乳を買う', '牛肉を買う']);
    fireEvent.change(input(), { target: { value: 'report' } });
    wait(300);
    expect(titles()).toEqual(['Report を書く']);
    expect(screen.getByText('1 件')).toBeTruthy();
  });

  test('Escape で検索の文字を消す', () => {
    show();
    fireEvent.change(input(), { target: { value: '牛乳' } });
    wait(300);
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(input().value).toBe('');
    wait(300);
    expect(titles()).toHaveLength(3);
  });

  test('入力欄の外で / を押すと、検索欄にフォーカスが移る', () => {
    show();
    expect(document.activeElement).not.toBe(input());
    const ev = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    act(() => {
      document.body.dispatchEvent(ev);
    });
    expect(document.activeElement).toBe(input());
    // ページの「/ で検索」など、ブラウザの動きは止める
    expect(ev.defaultPrevented).toBe(true);
  });

  test('画面から消えたら、/ を見張るのをやめる', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = show();
    unmount();
    expect(remove.mock.calls.some(([type]) => type === 'keydown')).toBe(true);
    remove.mockRestore();
  });
});
