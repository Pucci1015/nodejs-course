// 第56章 6節: 偽物の関数（mock.fn）と、メソッドの差し替え（mock.method）
// 使い方: node --test samples/remind.test.ts
import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { remindDueToday, type Task } from './remind.ts';

const now = new Date('2026-12-10T00:00:00Z');

// テストのデータを作る関数。指定しない項目は、ふつうの値にする
function aTask(overrides: Partial<Task> = {}): Task {
  return { id: 1, title: '牛乳を買う', status: 'todo', dueDate: '2026-12-10', ...overrides };
}

let tasks: Task[];
beforeEach(() => {
  // テストごとに作り直す（前のテストが書き換えても、影響しない）
  tasks = [
    aTask({ id: 1 }),
    aTask({ id: 2, status: 'done' }), // 終わっている
    aTask({ id: 3, dueDate: '2026-12-11' }), // 明日
    aTask({ id: 4, dueDate: null }), // 期限なし
    aTask({ id: 5, status: 'doing' }),
  ];
});

test('今日が期限で、終わっていないものだけ送る', async (t) => {
  const send = t.mock.fn(async (_task: Task) => {});
  const result = await remindDueToday(tasks, { now, send });

  assert.deepEqual(result, { sent: 2, failed: 0 });
  assert.deepEqual(
    send.mock.calls.map((call) => call.arguments[0]?.id),
    [1, 5],
  );
});

test('送れないものがあっても、残りは送る', async (t) => {
  const send = t.mock.fn(async (task: Task) => {
    if (task.id === 1) throw new Error('つながらない');
  });
  // console.error を、何も出さない偽物に替える（テストの出力を汚さないため）。テストが終わると戻る
  const error = t.mock.method(console, 'error', () => {});

  const result = await remindDueToday(tasks, { now, send });

  assert.deepEqual(result, { sent: 1, failed: 1 });
  assert.equal(send.mock.callCount(), 2);
  assert.equal(error.mock.callCount(), 1);
  assert.match(String(error.mock.calls[0]?.arguments[0]), /送れませんでした: 1/);
});
