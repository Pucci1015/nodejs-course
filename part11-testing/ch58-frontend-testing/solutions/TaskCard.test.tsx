// @vitest-environment jsdom
// 練習問題1の模範解答: TaskCard のテスト
// 確かめ方（exercises で）: node ../../tools/check-tests.ts ../solutions/TaskCard.test.tsx --vitest
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { CardTask } from '../exercises/TaskCard.tsx';

const { TaskCard }: typeof import('../exercises/TaskCard.tsx') = await import(
  /* @vite-ignore */ new URL(process.env.MODULE ?? '../exercises/TaskCard.tsx', import.meta.url).pathname
);

afterEach(cleanup);

const TODAY = '2026-12-10';
function card(overrides: Partial<CardTask> = {}): CardTask {
  return { id: 1, title: '牛乳を買う', done: false, dueDate: null, ...overrides };
}

describe('TaskCard', () => {
  test('題名がチェックボックスの名前になり、未完了ならチェックが無い', () => {
    render(<TaskCard task={card()} today={TODAY} onToggle={vi.fn()} onDelete={vi.fn()} />);

    const checkbox = screen.getByRole<HTMLInputElement>('checkbox', { name: '牛乳を買う' });
    expect(checkbox.checked).toBe(false);
  });

  // 追加: 完了なら、チェックが付く
  test('完了なら、チェックが付く', () => {
    render(<TaskCard task={card({ done: true })} today={TODAY} onToggle={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: '牛乳を買う' }).checked).toBe(true);
  });

  // 追加: 押すと、反対の値で onToggle が呼ばれる（未完了 → true、完了 → false の両方）
  test.each([
    { done: false, expected: true },
    { done: true, expected: false },
  ])('done が $done のとき押すと、onToggle(id, $expected)', async ({ done, expected }) => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<TaskCard task={card({ id: 5, done })} today={TODAY} onToggle={onToggle} onDelete={vi.fn()} />);

    await user.click(screen.getByRole('checkbox', { name: '牛乳を買う' }));

    expect(onToggle).toHaveBeenCalledExactlyOnceWith(5, expected);
  });

  // 追加: 「消す」は、題名の入った名前で探し、id を渡すことを確かめる
  test('「「題名」を消す」を押すと、onDelete(id)', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<TaskCard task={card({ id: 5 })} today={TODAY} onToggle={vi.fn()} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: '「牛乳を買う」を消す' }));

    expect(onDelete).toHaveBeenCalledExactlyOnceWith(5);
  });

  // 追加: 期限の出し方。境目（今日・昨日）と、完了のときを並べる
  test('期限が無ければ「期限なし」', () => {
    render(<TaskCard task={card()} today={TODAY} onToggle={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('期限なし')).toBeDefined();
    expect(screen.queryByText('期限切れ')).toBeNull();
  });

  test.each([
    { dueDate: '2026-12-09', done: false, overdue: true },
    { dueDate: '2026-12-10', done: false, overdue: false },
    { dueDate: '2026-12-11', done: false, overdue: false },
    { dueDate: '2026-12-09', done: true, overdue: false },
  ])('期限 $dueDate・done $done → 期限切れ: $overdue', ({ dueDate, done, overdue }) => {
    render(<TaskCard task={card({ dueDate, done })} today={TODAY} onToggle={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText(`期限: ${dueDate}`)).toBeDefined();
    expect(screen.queryByText('期限切れ') !== null).toBe(overdue);
  });
});
