// @vitest-environment jsdom
// 練習問題8の模範解答: useAutoSave のテスト（フェイクタイマーと renderHook）
// 確かめ方（exercises で）: node ../../tools/check-tests.ts ../solutions/useAutoSave.test.ts --vitest
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const { useAutoSave }: typeof import('../exercises/useAutoSave.ts') = await import(
  /* @vite-ignore */ new URL(process.env.MODULE ?? '../exercises/useAutoSave.ts', import.meta.url).pathname
);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function setup(save: (value: string) => Promise<void> = vi.fn(async () => {})) {
  const saveMock = vi.fn(save);
  const hook = renderHook(({ value }) => useAutoSave(value, saveMock, 1000), { initialProps: { value: 'a' } });
  return { ...hook, save: saveMock };
}

/** 時計を進める。act で包むと、その間の state の更新が画面（result）まで届く */
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** 後で解決する・失敗させる Promise */
function deferred() {
  let resolve!: () => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useAutoSave', () => {
  test('最初の値は保存せず、idle のまま', () => {
    const { result, save } = setup();

    advance(5000);

    expect(save).not.toHaveBeenCalled();
    expect(result.current).toBe('idle');
  });

  // 追加: 境目（999ms・1000ms）を確かめる
  test('変わると pending になり、1000ms たったら最新の値を1回だけ保存する', () => {
    const { result, rerender, save } = setup();

    rerender({ value: 'ab' });
    expect(result.current).toBe('pending');
    advance(999);
    expect(save).not.toHaveBeenCalled();
    advance(1);

    expect(save).toHaveBeenCalledExactlyOnceWith('ab');
    expect(result.current).toBe('saving');
  });

  // 追加: 続けて変えたら、最後の変更から数え直す
  test('続けて変えたら、最後の変更から 1000ms 後に、最後の値だけを保存する', () => {
    const { rerender, save } = setup();

    rerender({ value: 'ab' });
    advance(600);
    rerender({ value: 'abc' });
    advance(600);
    expect(save).not.toHaveBeenCalled();
    advance(400);

    expect(save).toHaveBeenCalledExactlyOnceWith('abc');
  });

  // 追加: Promise の解決は、await act(async …) で待つ（then の中の setState まで届く）
  test('保存が終わったら saved、失敗したら error', async () => {
    const first = deferred();
    const second = deferred();
    const save = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result, rerender } = setup(save);

    rerender({ value: 'ab' });
    advance(1000);
    await act(async () => first.resolve());
    expect(result.current).toBe('saved');

    rerender({ value: 'abc' });
    advance(1000);
    await act(async () => second.reject(new Error('つながりません')));
    expect(result.current).toBe('error');
  });

  // 追加: 待っている途中でアンマウントしたら、すぐ保存する
  test('待っている間にアンマウントしたら、すぐ最新の値を保存する', () => {
    const { rerender, unmount, save } = setup();

    rerender({ value: 'ab' });
    advance(300);
    unmount();

    expect(save).toHaveBeenCalledExactlyOnceWith('ab');
    // その後に時計を進めても、もう1回は保存しない
    advance(5000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  test('待っているものが無ければ、アンマウントしても保存しない', () => {
    const { unmount, save } = setup();

    unmount();

    expect(save).not.toHaveBeenCalled();
  });
});
