// 第58章 5節: API を読む部品。fetch を偽物に替え、出てくるまで待って（findBy…）確かめる
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { TaskListPanel } from './TaskListPanel.tsx';
import { createWrapper, fakeTaskApi, jsonResponse, mockFetch } from './test-helpers.tsx';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderPanel() {
  const { wrapper } = createWrapper();
  return render(<TaskListPanel />, { wrapper });
}

describe('TaskListPanel', () => {
  test('読み込み中と出て、読めたら一覧と件数を出す', async () => {
    mockFetch(() =>
      jsonResponse({
        items: [
          { id: 1, title: '牛乳を買う', done: false },
          { id: 2, title: '第58章を読む', done: true },
        ],
      }),
    );
    renderPanel();

    expect(screen.getByRole('status').textContent).toBe('読み込み中…');

    const list = await screen.findByRole('list', { name: 'タスク' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    // getBy… は、見つからなければ例外を投げる。それ自体が「ある」ことの確かめになる
    within(items[0]!).getByRole('checkbox', { name: '牛乳を買う' });
    within(items[1]!).getByRole('checkbox', { name: '第58章を読む' });
    expect(screen.getByText('2 件中 1 件完了')).toBeDefined();
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('読めなかったら理由を出し、「もう一度」で読み直す', async () => {
    const user = userEvent.setup();
    let calls = 0;
    const fetchMock = mockFetch(() => {
      calls += 1;
      return calls === 1
        ? jsonResponse({ title: 'サーバのエラー', status: 500 }, 500)
        : jsonResponse({ items: [{ id: 1, title: '牛乳を買う', done: false }] });
    });
    renderPanel();

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('一覧を読み込めませんでした')).toBeDefined();

    await user.click(within(alert).getByRole('button', { name: 'もう一度' }));

    expect(await screen.findByRole('checkbox', { name: '牛乳を買う' })).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('足すと POST で送り、一覧を読み直して最後に出す', async () => {
    const user = userEvent.setup();
    const api = fakeTaskApi([{ id: 1, title: '牛乳を買う', done: false }]);
    renderPanel();
    await screen.findByRole('list', { name: 'タスク' });

    await user.type(screen.getByRole('textbox', { name: '新しいタスク' }), 'パンを買う{Enter}');

    // 読み直した一覧に出るまで待つ
    expect(await screen.findByRole('checkbox', { name: 'パンを買う' })).toBeDefined();
    expect(api.requests.map((r) => `${r.method} ${r.url}`)).toEqual(['GET /api/tasks', 'POST /api/tasks', 'GET /api/tasks']);
    expect(api.requests[1]?.body).toEqual({ title: 'パンを買う' });
    expect(screen.getByText('2 件中 0 件完了')).toBeDefined();
  });
});
