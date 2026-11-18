// 練習問題5: サービスの単体テストを書く（データはメモリの偽物、「今」は決まった日）
// 使い方: node --test service.test.ts
//         node ../../tools/check-tests.ts service.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createMemoryRepo } from './memory-repo.ts';
import { ConflictError, ValidationError, type Task } from './types.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './service.ts');
const { createTaskService }: typeof import('./service.ts') = await import(pathToFileURL(file).href);

const now = () => new Date('2026-12-10T00:00:00Z'); // 日本時間 2026-12-10 の 9 時

function aTask(overrides: Partial<Task> = {}): Task {
  return { id: 1, title: 'タスク', status: 'todo', dueDate: null, ...overrides };
}

test('題名の前後の空白を除いて作る', async () => {
  const service = createTaskService({ repo: createMemoryRepo(), now });
  const task = await service.create({ title: '  牛乳を買う ' });
  assert.equal(task.title, '牛乳を買う');
});

// ここを書く（テストを書き足す）
void ConflictError;
void ValidationError;
void aTask;
