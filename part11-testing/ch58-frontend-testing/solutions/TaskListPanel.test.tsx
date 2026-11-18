// @vitest-environment jsdom
// 練習問題5の模範解答: TaskListPanel の、本文で確かめていない所のテスト
// 確かめ方（exercises で）: node ../../tools/check-tests.ts ../solutions/TaskListPanel.test.tsx --vitest
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createWrapper, fakeTaskApi, jsonResponse, mockFetch } from '../exercises/test-helpers.tsx';

const { TaskListPanel }: typeof import('../exercises/TaskListPanel.tsx') = await import(
  /* @vite-ignore */ new URL(process.env.MODULE ?? '../exercises/TaskListPanel.tsx', import.meta.url).pathname
);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderPanel() {
  const { wrapper } = createWrapper();
  return render(<TaskListPanel />, { wrapper });
}

describe('TaskListPanel', () => {
  test('一覧が出る（準備の見本）', async () => {
    fakeTaskApi([{ id: 1, title: '牛乳を買う', done: false }]);
    renderPanel();

    const list = await screen.findByRole('list', { name: 'タスク' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
  });

  // 追加: 空の一覧
  test('タスクが無ければ「タスクはまだありません」', async () => {
    fakeTaskApi([]);
    renderPanel();

    expect(await screen.findByText('タスクはまだありません')).toBeDefined();
    expect(screen.queryByRole('list')).toBeNull();
  });

  // 追加: 送った本文と、読み直した後の画面の両方を確かめる
  test('チェックを付けると PATCH で done: true を送り、読み直して完了と出す', async () => {
    const user = userEvent.setup();
    const api = fakeTaskApi([{ id: 1, title: '牛乳を買う', done: false }]);
    renderPanel();

    await user.click(await screen.findByRole('checkbox', { name: '牛乳を買う' }));

    expect(await screen.findByText('1 件中 1 件完了')).toBeDefined();
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: '牛乳を買う' }).checked).toBe(true);
    expect(api.requests[1]).toEqual({ method: 'PATCH', url: '/api/tasks/1', body: { done: true } });
  });

  // 追加: 消したら、読み直した一覧から消える。waitFor の代わりに、残るほうが出るまで待ってから確かめる
  test('「消す」で DELETE を送り、読み直して一覧から消す', async () => {
    const user = userEvent.setup();
    const api = fakeTaskApi([
      { id: 1, title: '牛乳を買う', done: false },
      { id: 2, title: '第58章を読む', done: true },
    ]);
    renderPanel();

    await user.click(await screen.findByRole('button', { name: '「第58章を読む」を消す' }));

    expect(await screen.findByText('1 件中 0 件完了')).toBeDefined();
    expect(screen.queryByRole('checkbox', { name: '第58章を読む' })).toBeNull();
    expect(api.requests.map((r) => `${r.method} ${r.url}`)).toEqual(['GET /api/tasks', 'DELETE /api/tasks/2', 'GET /api/tasks']);
  });

  // 追加: サーバが 422 を返したら、フォームに理由が出て、打った題名は残る
  test('足すのに失敗したら（422）、理由をフォームに出す', async () => {
    const user = userEvent.setup();
    fakeTaskApi([{ id: 1, title: '牛乳を買う', done: false }], (method) =>
      method === 'POST'
        ? jsonResponse({ title: '入力が正しくありません', errors: [{ pointer: '/title', detail: '同じ題名のタスクがあります' }] }, 422)
        : undefined,
    );
    renderPanel();
    await screen.findByRole('list', { name: 'タスク' });

    const input = screen.getByRole<HTMLInputElement>('textbox', { name: '新しいタスク' });
    await user.type(input, '牛乳を買う{Enter}');

    const form = screen.getByRole('form', { name: 'タスクを足す' });
    expect((await within(form).findByRole('alert')).textContent).toBe('同じ題名のタスクがあります');
    expect(input.value).toBe('牛乳を買う');
  });

  // 追加: 変更に失敗したら理由を出す。ここは mockFetch で、GET は成功・PATCH は 500 にする
  test('完了の切り替えに失敗したら「変更できませんでした」と出す', async () => {
    const user = userEvent.setup();
    mockFetch((_url, init) =>
      init.method === 'PATCH'
        ? jsonResponse({ title: 'サーバのエラー' }, 500)
        : jsonResponse({ items: [{ id: 1, title: '牛乳を買う', done: false }] }),
    );
    renderPanel();

    await user.click(await screen.findByRole('checkbox', { name: '牛乳を買う' }));

    expect((await screen.findByRole('alert')).textContent).toBe('変更できませんでした: サーバのエラー');
  });
});
