// 第58章 2〜3節: 部品のテスト。役割（role）と名前で探し、props の関数が呼ばれたかを確かめる
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { TaskItem } from './TaskItem.tsx';

afterEach(cleanup);

describe('TaskItem', () => {
  test('題名が、チェックボックスの名前になる', () => {
    render(<TaskItem task={{ id: 1, title: '牛乳を買う', done: false }} onToggle={vi.fn()} onDelete={vi.fn()} />);

    const checkbox = screen.getByRole<HTMLInputElement>('checkbox', { name: '牛乳を買う' });
    expect(checkbox.checked).toBe(false);
    expect(screen.queryByText('完了')).toBeNull();
  });

  test('完了のタスクは、チェックが付き「完了」と出る', () => {
    render(<TaskItem task={{ id: 2, title: '第58章を読む', done: true }} onToggle={vi.fn()} onDelete={vi.fn()} />);

    const checkbox = screen.getByRole<HTMLInputElement>('checkbox', { name: '第58章を読む' });
    expect(checkbox.checked).toBe(true);
    expect(screen.getByText('完了')).toBeDefined();
  });

  test('チェックを押すと、onToggle(id, true) が呼ばれる', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<TaskItem task={{ id: 1, title: '牛乳を買う', done: false }} onToggle={onToggle} onDelete={vi.fn()} />);

    await user.click(screen.getByRole('checkbox', { name: '牛乳を買う' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(1, true);
  });

  test('「消す」を押すと、onDelete(id) が呼ばれる', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<TaskItem task={{ id: 7, title: '牛乳を買う', done: false }} onToggle={vi.fn()} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: '「牛乳を買う」を消す' }));

    expect(onDelete).toHaveBeenCalledWith(7);
  });
});
