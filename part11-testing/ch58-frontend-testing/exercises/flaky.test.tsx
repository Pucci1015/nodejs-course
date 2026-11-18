// @vitest-environment jsdom
// 練習問題6: ときどき失敗する（フレーキーな）テストを直す
// 使い方: npx vitest run flaky.test.tsx          … ふつうに動かすと、たいてい通る
//         node check-flaky.ts flaky.test.tsx     … 遅れと順番を変えて、何度も動かす
// 決まり: テストの名前と、確かめていること（expect の中身）は変えない。部品（TaskListPanel・AddTaskForm）も変えない
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { AddTaskForm } from './AddTaskForm.tsx';
import { TaskListPanel } from './TaskListPanel.tsx';
import { jsonResponse, mockFetch } from './test-helpers.tsx';
import type { Task } from './api.ts';

// 偽物の API の応答の遅れ（check-flaky.ts が 0ms と 150ms で動かす）
const DELAY_MS = Number(process.env.FAKE_DELAY_MS ?? 0);

/** 遅れて一覧を返す、偽物の API */
function serveTasks(items: Task[]) {
  mockFetch(async () => {
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    return jsonResponse({ items });
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function renderPanel() {
  return render(
    <QueryClientProvider client={queryClient}>
      <TaskListPanel />
    </QueryClientProvider>,
  );
}

describe('TaskListPanel', () => {
  test('最初は「読み込み中…」、読めたら「タスクはまだありません」', async () => {
    serveTasks([]);
    renderPanel();

    expect(screen.getByRole('status').textContent).toBe('読み込み中…');
    expect(await screen.findByText('タスクはまだありません')).toBeDefined();
  });

  test('一覧に題名が出る', async () => {
    serveTasks([{ id: 1, title: '牛乳を買う', done: false }]);
    renderPanel();

    // 少し待ってから探す
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByRole('checkbox', { name: '牛乳を買う' })).toBeDefined();
  });
});

const onAdd = vi.fn(async () => {});

describe('AddTaskForm', () => {
  test('Enter で1回だけ送る', async () => {
    const user = userEvent.setup();
    render(<AddTaskForm onAdd={onAdd} />);

    await user.type(screen.getByRole('textbox', { name: '新しいタスク' }), '牛乳を買う{Enter}');

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  test('「追加」を押して送る', async () => {
    const user = userEvent.setup();
    render(<AddTaskForm onAdd={onAdd} />);

    await user.type(screen.getByRole('textbox', { name: '新しいタスク' }), 'パンを買う');
    await user.click(screen.getByRole('button', { name: '追加' }));

    expect(onAdd).toHaveBeenLastCalledWith('パンを買う');
  });
});
