// @vitest-environment jsdom
// 練習問題8: useAutoSave のテストを、偽物の時計（フェイクタイマー）と renderHook で書く
// 使い方: npx vitest run useAutoSave.test.ts
//         node ../../tools/check-tests.ts useAutoSave.test.ts --vitest
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const { useAutoSave }: typeof import('./useAutoSave.ts') = await import(
  /* @vite-ignore */ new URL(process.env.MODULE ?? './useAutoSave.ts', import.meta.url).pathname
);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/** フックを描く。rerender({ value }) で値を変えられる */
function setup(save: (value: string) => Promise<void> = vi.fn(async () => {})) {
  const saveMock = vi.fn(save);
  const hook = renderHook(({ value }) => useAutoSave(value, saveMock, 1000), { initialProps: { value: 'a' } });
  return { ...hook, save: saveMock };
}

describe('useAutoSave', () => {
  test('最初の値は保存せず、idle のまま', () => {
    const { result, save } = setup();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(save).not.toHaveBeenCalled();
    expect(result.current).toBe('idle');
  });

  // ここを書く
});
