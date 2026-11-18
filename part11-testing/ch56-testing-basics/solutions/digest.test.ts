// 練習問題5 の模範解答: 偽物の関数（mock.fn）で、だれに・何回・何を送ったかを確かめる
// 確かめ方（exercises/ で）: node ../../tools/check-tests.ts ../solutions/digest.test.ts
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Task, User } from '../exercises/digest.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? '../exercises/digest.ts');
const { sendDigest }: typeof import('../exercises/digest.ts') = await import(pathToFileURL(file).href);

// 日本時間 2026-12-10
const now = new Date('2026-12-10T00:00:00Z');
const alice: User = { id: 1, email: 'alice@example.com' };
const bob: User = { id: 2, email: 'bob@example.com' };

// 追加: 人ごとのタスクを表で持つ偽物と、send の偽物を作る部品
function fakes(t: TestContext, tasksOf: Record<number, Task[]>, failFor: string[] = []) {
  const listTasks = t.mock.fn(async (userId: number) => tasksOf[userId] ?? []);
  const send = t.mock.fn(async (to: string, _count: number) => {
    if (failFor.includes(to)) throw new Error('送れない');
  });
  return { listTasks, send };
}

test('3日以内のタスクが2つあれば、2 と書いて1通送る', async (t) => {
  const { listTasks, send } = fakes(t, {
    1: [
      { id: 1, status: 'todo', dueDate: '2026-12-11' },
      { id: 2, status: 'doing', dueDate: '2026-12-13' },
    ],
  });
  const failed = await sendDigest([alice], { now, listTasks, send });

  assert.deepEqual(failed, []);
  assert.equal(send.mock.callCount(), 1);
  assert.deepEqual(send.mock.calls[0]?.arguments, ['alice@example.com', 2]);
});

test('数えないもの: 終わったもの・期限なし・4日後', async (t) => {
  const { listTasks, send } = fakes(t, {
    1: [
      { id: 1, status: 'done', dueDate: '2026-12-10' },
      { id: 2, status: 'todo', dueDate: null },
      { id: 3, status: 'todo', dueDate: '2026-12-14' },
      { id: 4, status: 'todo', dueDate: '2026-12-13' }, // これだけ数える（3日後）
    ],
  });
  await sendDigest([alice], { now, listTasks, send });
  assert.deepEqual(send.mock.calls[0]?.arguments, ['alice@example.com', 1]);
});

test('期限を過ぎたものも数える', async (t) => {
  const { listTasks, send } = fakes(t, { 1: [{ id: 1, status: 'todo', dueDate: '2026-12-01' }] });
  await sendDigest([alice], { now, listTasks, send });
  assert.deepEqual(send.mock.calls[0]?.arguments, ['alice@example.com', 1]);
});

test('数えるものが無い人には送らない', async (t) => {
  const { listTasks, send } = fakes(t, { 2: [{ id: 1, status: 'todo', dueDate: '2026-12-11' }] });
  await sendDigest([alice, bob], { now, listTasks, send });
  assert.deepEqual(
    send.mock.calls.map((call) => call.arguments[0]),
    ['bob@example.com'],
  );
  // 人ごとに、その人の id でタスクを読んだ
  assert.deepEqual(
    listTasks.mock.calls.map((call) => call.arguments[0]),
    [1, 2],
  );
});

test('送れなかった人の id を返し、残りの人にも送る', async (t) => {
  const due = [{ id: 1, status: 'todo', dueDate: '2026-12-11' } satisfies Task];
  const { listTasks, send } = fakes(t, { 1: due, 2: due }, ['alice@example.com']);
  const failed = await sendDigest([alice, bob], { now, listTasks, send });

  assert.deepEqual(failed, [1]);
  assert.equal(send.mock.callCount(), 2);
});
