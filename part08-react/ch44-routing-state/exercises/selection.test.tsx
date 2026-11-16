// @vitest-environment jsdom
// 第44章 練習問題8のテスト: npx vitest run selection.test.tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
// 確かめるファイル。MODULE=../solutions/selection.tsx で模範解答に替えられる
const mod: typeof import('./selection.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './selection.tsx', import.meta.url).pathname);
afterEach(cleanup);
const { selectionReducer, SelectionProvider, SelectableItem, SelectionBar, useSelection } = mod;

describe('selectionReducer', () => {
  test('toggled: 無ければ後ろに足し、あれば除く', () => {
    expect(selectionReducer([1], { type: 'toggled', id: 3 })).toEqual([1, 3]);
    expect(selectionReducer([1, 3], { type: 'toggled', id: 1 })).toEqual([3]);
  });
  test('all-selected: 今のものに足す（同じものは1つ）', () => {
    expect(selectionReducer([2], { type: 'all-selected', ids: [1, 2, 3] })).toEqual([2, 1, 3]);
  });
  test('cleared: 空にする。もともと空なら、同じ配列を返す', () => {
    expect(selectionReducer([1, 2], { type: 'cleared' })).toEqual([]);
    const empty: number[] = [];
    expect(selectionReducer(empty, { type: 'cleared' })).toBe(empty);
  });
  test('元の配列は変えない', () => {
    const s = Object.freeze([1, 2]) as number[];
    selectionReducer(s, { type: 'toggled', id: 3 });
    selectionReducer(s, { type: 'toggled', id: 1 });
    expect(s).toEqual([1, 2]);
  });
});

describe('SelectionProvider', () => {
  const tasks = [
    { id: 1, title: '牛乳を買う' },
    { id: 2, title: '本を返す' },
    { id: 3, title: '掃除' },
  ];
  // 一覧とバーは、別々の場所にある（props で選択を渡していない）
  const show = () =>
    render(
      <SelectionProvider>
        <header>
          <SelectionBar allIds={tasks.map((t) => t.id)} />
        </header>
        <main>
          <ul>
            {tasks.map((t) => (
              <SelectableItem key={t.id} {...t} />
            ))}
          </ul>
        </main>
      </SelectionProvider>,
    );
  const checked = () => screen.getAllByRole<HTMLInputElement>('checkbox').map((c) => c.checked);

  test('最初は何も選ばれておらず、バーには「すべて選ぶ」だけ', () => {
    show();
    expect(checked()).toEqual([false, false, false]);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('button', { name: '選択を解除' })).toBeNull();
  });

  test('チェックすると、バーに数が出る', async () => {
    show();
    await userEvent.click(screen.getByRole('checkbox', { name: '本を返す' }));
    await userEvent.click(screen.getByRole('checkbox', { name: '掃除' }));
    expect(screen.getByRole('status').textContent).toBe('2 件選択中');
    await userEvent.click(screen.getByRole('checkbox', { name: '掃除' }));
    expect(screen.getByRole('status').textContent).toBe('1 件選択中');
  });

  test('すべて選ぶ・選択を解除', async () => {
    show();
    await userEvent.click(screen.getByRole('button', { name: 'すべて選ぶ' }));
    expect(checked()).toEqual([true, true, true]);
    expect(screen.getByRole('status').textContent).toBe('3 件選択中');
    await userEvent.click(screen.getByRole('button', { name: '選択を解除' }));
    expect(checked()).toEqual([false, false, false]);
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('Provider の外で useSelection を使うと、例外', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Outside() {
      useSelection();
      return null;
    }
    expect(() => render(<Outside />)).toThrow('useSelection は <SelectionProvider> の中で使ってください');
    spy.mockRestore();
  });
});
