// @vitest-environment jsdom
// 練習問題6の模範解答: ときどき失敗する（フレーキーな）テストを直したもの
// 確かめ方（exercises で）: node check-flaky.ts ../solutions/flaky.test.tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { AddTaskForm } from '../exercises/AddTaskForm.tsx';
import { TaskListPanel } from '../exercises/TaskListPanel.tsx';
import { createWrapper, jsonResponse, mockFetch } from '../exercises/test-helpers.tsx';
import type { Task } from '../exercises/api.ts';

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

// 修正: QueryClient をファイルで1つ共有すると、前のテストで読んだ一覧が覚えられていて、
//       「読み込み中…」が出ないことがある（順番しだい）。テストごとに新しく作る
function renderPanel() {
  const { wrapper } = createWrapper();
  return render(<TaskListPanel />, { wrapper });
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

    // 修正: 決まった時間だけ待つと、応答が遅いと間に合わない。出てくるまで待つ（findBy…）
    expect(await screen.findByRole('checkbox', { name: '牛乳を買う' })).toBeDefined();
  });
});

describe('AddTaskForm', () => {
  // 修正: vi.fn をファイルで1つ共有すると、前のテストで呼ばれた回数が残る（順番しだい）。テストごとに作る
  test('Enter で1回だけ送る', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn(async () => {});
    render(<AddTaskForm onAdd={onAdd} />);

    await user.type(screen.getByRole('textbox', { name: '新しいタスク' }), '牛乳を買う{Enter}');

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  test('「追加」を押して送る', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn(async () => {});
    render(<AddTaskForm onAdd={onAdd} />);

    await user.type(screen.getByRole('textbox', { name: '新しいタスク' }), 'パンを買う');
    await user.click(screen.getByRole('button', { name: '追加' }));

    expect(onAdd).toHaveBeenLastCalledWith('パンを買う');
  });
});
