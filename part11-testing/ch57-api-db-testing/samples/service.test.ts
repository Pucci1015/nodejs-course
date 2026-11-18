// 第57章 4.1節: サービスの単体テスト。データの置き場所はメモリの偽物、「今」は決まった日
// 使い方: node --test samples/service.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryRepo } from './memory-repo.ts';
import { createTaskService } from './service.ts';
import { ConflictError, ValidationError, type Task } from './types.ts';

const now = () => new Date('2026-12-10T00:00:00Z'); // 日本時間 2026-12-10

// テストのデータを作る関数（第56章 6.1節）
function aTask(overrides: Partial<Task> = {}): Task {
  return { id: 1, title: 'タスク', status: 'todo', dueDate: null, ...overrides };
}

test('題名の前後の空白を除いて作る', async () => {
  const service = createTaskService({ repo: createMemoryRepo(), now });
  const task = await service.create({ title: '  牛乳を買う ' });
  assert.equal(task.title, '牛乳を買う');
});

test('期限は今日なら作れ、昨日なら ValidationError', async () => {
  const service = createTaskService({ repo: createMemoryRepo(), now });
  await service.create({ title: 'a', dueDate: '2026-12-10' });
  await assert.rejects(service.create({ title: 'b', dueDate: '2026-12-09' }), ValidationError);
});

test('doing が3つあると、4つ目は ConflictError', async () => {
  // 準備したい状態を、seed で直接作る（API を何回も呼ばなくてよい）
  const repo = createMemoryRepo([
    aTask({ id: 1, status: 'doing' }),
    aTask({ id: 2, title: 'b', status: 'doing' }),
    aTask({ id: 3, title: 'c', status: 'doing' }),
    aTask({ id: 4, title: 'd' }),
  ]);
  const service = createTaskService({ repo, now });

  await assert.rejects(service.changeStatus(4, 'doing'), ConflictError);
  assert.equal((await repo.get(4))?.status, 'todo'); // 変わっていない
});
