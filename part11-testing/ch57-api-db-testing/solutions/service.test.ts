// 練習問題5 の模範解答: サービスの単体テスト
// 確かめ方（exercises/ で）: node ../../tools/check-tests.ts ../solutions/service.test.ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createMemoryRepo } from '../exercises/memory-repo.ts';
import { ConflictError, ValidationError, type Task } from '../exercises/types.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? '../exercises/service.ts');
const { createTaskService }: typeof import('../exercises/service.ts') = await import(pathToFileURL(file).href);

const now = () => new Date('2026-12-10T00:00:00Z'); // 日本時間 2026-12-10 の 9 時

function aTask(overrides: Partial<Task> = {}): Task {
  return { id: 1, title: 'タスク', status: 'todo', dueDate: null, ...overrides };
}

describe('create', () => {
  test('題名の前後の空白を除いて作る', async () => {
    const service = createTaskService({ repo: createMemoryRepo(), now });
    const task = await service.create({ title: '  牛乳を買う ' });
    assert.equal(task.title, '牛乳を買う');
  });

  // 追加: 題名の長さの境界（100 と 101）
  test('題名は 100 文字まで', async () => {
    const service = createTaskService({ repo: createMemoryRepo(), now });
    await service.create({ title: 'a'.repeat(100) });
    await assert.rejects(service.create({ title: 'b'.repeat(101) }), ValidationError);
  });

  // 追加: 期限の境界（今日と昨日）
  test('期限は今日なら作れ、昨日なら ValidationError', async () => {
    const service = createTaskService({ repo: createMemoryRepo(), now });
    await service.create({ title: 'a', dueDate: '2026-12-10' });
    await assert.rejects(service.create({ title: 'b', dueDate: '2026-12-09' }), ValidationError);
  });

  // 追加: 「今日」は日本時間で決める（UTC ではまだ 12-09 の時刻）
  test('日本時間の 0 時 30 分には、UTC の日付の「昨日」は過去', async () => {
    const service = createTaskService({ repo: createMemoryRepo(), now: () => new Date('2026-12-09T15:30:00Z') });
    await assert.rejects(service.create({ title: 'a', dueDate: '2026-12-09' }), ValidationError);
  });
});

describe('changeStatus', () => {
  // 追加: 準備したい状態を seed で作る
  function withDoing(count: number) {
    const seed = [aTask({ id: 1, title: 'x' })];
    for (let i = 0; i < count; i++) seed.push(aTask({ id: i + 2, title: `doing${i}`, status: 'doing' }));
    const repo = createMemoryRepo(seed);
    return { repo, service: createTaskService({ repo, now }) };
  }

  test('doing が2つなら、3つ目にできる', async () => {
    const { service } = withDoing(2);
    assert.equal((await service.changeStatus(1, 'doing'))?.status, 'doing');
  });

  test('doing が3つなら、4つ目は ConflictError で、変わらない', async () => {
    const { repo, service } = withDoing(3);
    await assert.rejects(service.changeStatus(1, 'doing'), ConflictError);
    assert.equal((await repo.get(1))?.status, 'todo');
  });

  test('すでに doing のタスクを doing にしても、数に入れない', async () => {
    const { service } = withDoing(3);
    assert.equal((await service.changeStatus(2, 'doing'))?.status, 'doing');
  });

  test('無いタスクは undefined', async () => {
    const { service } = withDoing(0);
    assert.equal(await service.changeStatus(99, 'done'), undefined);
  });
});
