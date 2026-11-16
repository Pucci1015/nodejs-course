// @vitest-environment jsdom
// 第49章 練習問題7のテスト: npx vitest run DoneToggle.test.tsx
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { startsWithDirective } from './check-directive.ts';
// 確かめるファイル。MODULE=../solutions/components/DoneToggle.tsx で模範解答に替えられる
const path = new URL(process.env.MODULE ?? './components/DoneToggle.tsx', import.meta.url).pathname;
const mod: typeof import('./components/DoneToggle.tsx') = await import(/* @vite-ignore */ path);
afterEach(cleanup);
const { DoneToggle } = mod;

type Result = { error: string | null };
/** 偽物の Server Action。呼ばれたら、テストが finish() を呼ぶまで終わらない */
function fakeAction() {
  let finish: (r: Result) => void = () => {};
  const action = vi.fn(
    (_done: boolean) =>
      new Promise<Result>((resolve) => {
        finish = resolve;
      }),
  );
  return { action, finish: (r: Result) => act(async () => finish(r)) };
}
const box = () => screen.getByRole<HTMLInputElement>('checkbox', { name: '完了' });
const click = () => act(async () => fireEvent.click(box()));

test("ファイルの1行目が 'use client'", () => {
  expect(startsWithDirective(path, 'use client')).toBe(true);
});

test('「完了」のチェックボックスが、done の値で出る', () => {
  const { rerender } = render(<DoneToggle done={false} action={vi.fn()} />);
  expect(box().checked).toBe(false);
  rerender(<DoneToggle done action={vi.fn()} />);
  expect(box().checked).toBe(true);
});

test('押すと、返事を待たずにチェックが付き、action(true) が呼ばれる', async () => {
  const { action, finish } = fakeAction();
  const { rerender } = render(<DoneToggle done={false} action={action} />);
  await click();
  expect(action).toHaveBeenCalledWith(true);
  expect(box().checked).toBe(true); // まだ返事は来ていない
  // 成功: サーバで作り直したページから、新しい done が届く
  rerender(<DoneToggle done action={action} />);
  await finish({ error: null });
  expect(box().checked).toBe(true);
  expect(screen.queryByRole('alert')).toBeNull();
});

test('失敗したら、元の値に戻り、理由を role="alert" で出す', async () => {
  const { action, finish } = fakeAction();
  render(<DoneToggle done={false} action={action} />);
  await click();
  expect(box().checked).toBe(true);
  await finish({ error: 'ほかの人が先に変えました。読み直してください' }); // done は false のまま
  expect(box().checked).toBe(false);
  expect(screen.getByRole('alert').textContent).toBe('ほかの人が先に変えました。読み直してください');
});

test('外すときは action(false)', async () => {
  const { action } = fakeAction();
  render(<DoneToggle done action={action} />);
  await click();
  expect(action).toHaveBeenCalledWith(false);
  expect(box().checked).toBe(false);
});
