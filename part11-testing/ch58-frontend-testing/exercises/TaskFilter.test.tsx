// @vitest-environment jsdom
// 練習問題3のテスト（書き換えなくてよい）: npx vitest run TaskFilter.test.tsx
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { FilterTask } from './TaskFilter.tsx';

const { TaskFilter }: typeof import('./TaskFilter.tsx') = await import(
  /* @vite-ignore */ new URL(process.env.MODULE ?? './TaskFilter.tsx', import.meta.url).pathname
);

afterEach(cleanup);

const tasks: FilterTask[] = [
  { id: 1, title: '牛乳を買う', done: false },
  { id: 2, title: '第58章を読む', done: true },
  { id: 3, title: 'パンを買う', done: false },
];

function radio(name: string) {
  const group = screen.getByRole('group', { name: '表示するタスク' });
  return within(group).getByRole<HTMLInputElement>('radio', { name });
}

describe('TaskFilter', () => {
  test('「表示するタスク」のまとまりに、件数つきの3つの選択肢がある', () => {
    render(<TaskFilter tasks={tasks} filter="all" onChange={vi.fn()} />);

    const group = screen.getByRole('group', { name: '表示するタスク' });
    const names = within(group)
      .getAllByRole('radio')
      .map((r) => r.getAttribute('value'));
    expect(names).toEqual(['all', 'open', 'done']);
    expect(radio('すべて (3)')).toBeDefined();
    expect(radio('未完了 (2)')).toBeDefined();
    expect(radio('完了 (1)')).toBeDefined();
  });

  test.each([
    { filter: 'all', checked: 'すべて (3)' },
    { filter: 'open', checked: '未完了 (2)' },
    { filter: 'done', checked: '完了 (1)' },
  ] as const)('filter が $filter なら「$checked」だけが選ばれている', ({ filter, checked }) => {
    render(<TaskFilter tasks={tasks} filter={filter} onChange={vi.fn()} />);

    for (const name of ['すべて (3)', '未完了 (2)', '完了 (1)']) {
      expect(radio(name).checked).toBe(name === checked);
    }
  });

  test('選ぶと onChange に、その値を渡す', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TaskFilter tasks={tasks} filter="all" onChange={onChange} />);

    await user.click(radio('完了 (1)'));

    expect(onChange).toHaveBeenCalledExactlyOnceWith('done');
  });

  test('3つの選択肢は、同じ name を持つ（矢印キーで動けるひとまとまりになる）', () => {
    render(<TaskFilter tasks={tasks} filter="all" onChange={vi.fn()} />);

    const names = new Set(screen.getAllByRole<HTMLInputElement>('radio').map((r) => r.name));
    expect(names.size).toBe(1);
    expect([...names][0]).not.toBe('');
  });

  test('件数のまとめを role="status" で出す', () => {
    render(<TaskFilter tasks={tasks} filter="all" onChange={vi.fn()} />);

    expect(screen.getByRole('status').textContent).toBe('3 件中 1 件完了');
  });

  test('タスクが無ければ「タスクはありません」', () => {
    render(<TaskFilter tasks={[]} filter="all" onChange={vi.fn()} />);

    expect(screen.getByRole('status').textContent).toBe('タスクはありません');
    expect(radio('すべて (0)').checked).toBe(true);
  });

  test('2つ描いても、name がぶつからない（useId で作る）', () => {
    render(
      <>
        <TaskFilter tasks={tasks} filter="all" onChange={vi.fn()} />
        <TaskFilter tasks={tasks} filter="done" onChange={vi.fn()} />
      </>,
    );

    const [first, second] = screen.getAllByRole('group', { name: '表示するタスク' });
    const nameOf = (group: HTMLElement | undefined) => within(group!).getAllByRole<HTMLInputElement>('radio')[0]?.name;
    expect(nameOf(first)).not.toBe(nameOf(second));
  });
});
