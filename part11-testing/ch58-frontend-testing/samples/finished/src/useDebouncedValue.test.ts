// 第58章 6節: 時間で動くフックを、偽物の時計（フェイクタイマー）で確かめる
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue.ts';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

test('最後に変わってから 300ms たつまで、前の値のまま', () => {
  const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
    initialProps: { value: 'a' },
  });
  expect(result.current).toBe('a');

  rerender({ value: 'ab' });
  act(() => {
    vi.advanceTimersByTime(200);
  });
  rerender({ value: 'abc' }); // 200ms の所でまた変わる → 数え直し
  act(() => {
    vi.advanceTimersByTime(299);
  });
  expect(result.current).toBe('a');

  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(result.current).toBe('abc');
});
