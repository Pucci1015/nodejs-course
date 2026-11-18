// @vitest-environment jsdom
// 練習問題5: TaskListPanel の、本文で確かめていない所のテストを書く
// 使い方: npx vitest run TaskListPanel.test.tsx
//         node ../../tools/check-tests.ts TaskListPanel.test.tsx --vitest
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createWrapper, fakeTaskApi, jsonResponse, mockFetch } from './test-helpers.tsx';

const { TaskListPanel }: typeof import('./TaskListPanel.tsx') = await import(
  /* @vite-ignore */ new URL(process.env.MODULE ?? './TaskListPanel.tsx', import.meta.url).pathname
);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** テストごとに新しい QueryClient で描く */
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

  // ここを書く（jsonResponse・mockFetch は、失敗のまねをするときに使う）
});
