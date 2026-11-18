// 練習問題5: sendDigest のテストを、偽物の関数（mock.fn）で書く
// 使い方: node --test digest.test.ts
//         node ../../tools/check-tests.ts digest.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Task, User } from './digest.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './digest.ts');
const { sendDigest }: typeof import('./digest.ts') = await import(pathToFileURL(file).href);

// 日本時間 2026-12-10
const now = new Date('2026-12-10T00:00:00Z');
const alice: User = { id: 1, email: 'alice@example.com' };
const bob: User = { id: 2, email: 'bob@example.com' };

test('3日以内のタスクが2つあれば、2 と書いて1通送る', async (t) => {
  const tasks: Task[] = [
    { id: 1, status: 'todo', dueDate: '2026-12-11' },
    { id: 2, status: 'doing', dueDate: '2026-12-13' },
  ];
  const listTasks = t.mock.fn(async (_userId: number) => tasks);
  const send = t.mock.fn(async (_to: string, _count: number) => {});

  const failed = await sendDigest([alice], { now, listTasks, send });

  assert.deepEqual(failed, []);
  assert.equal(send.mock.callCount(), 1);
  assert.deepEqual(send.mock.calls[0]?.arguments, ['alice@example.com', 2]);
});

// ここを書く（テストを書き足す）
