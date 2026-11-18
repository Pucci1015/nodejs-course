// 追加（第11部）: タスクのサービスの単体テスト（第57章 4節）
// データの層はメモリの偽物（test/support/memory-tasks.ts）、「今」は決まった時刻。PostgreSQL もサーバも要らないので速い
// 偽物が本物と同じように動くことは、契約テスト（test/contract/）で確かめてある
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictError, NotFoundError, PreconditionFailedError, ValidationError } from '../../src/errors.ts';
import { createTaskService } from '../../src/services/tasks.ts';
import type { Task } from '../../src/types.ts';
import { createMemoryTaskRepo } from '../support/memory-tasks.ts';

// 2026-12-09T15:30Z は、日本時間の 2026-12-10 00:30（UTC ではまだ 12-09。日付の境目を確かめるため）
const NOW = new Date('2026-12-09T15:30:00Z');
const clock = () => NOW;

/** テストのデータを作る関数（第56章 6.1節） */
function aTask(overrides: Partial<Task> = {}): Task {
  const at = '2026-12-01T00:00:00.000Z';
  return {
    id: 1,
    title: 'タスク',
    status: 'todo',
    dueDate: null,
    createdAt: at,
    updatedAt: at,
    completedAt: null,
    version: 1,
    ...overrides,
  };
}

/** サービスと、知らせ（publish）の記録を作る */
function setup(seed: Task[] = [], options: { maxDoing?: number } = {}) {
  const repo = createMemoryTaskRepo(seed);
  const events: string[] = [];
  const service = createTaskService({
    repo,
    clock,
    ...options,
    publish: (type, task) => events.push(`${type}:${task.id}`),
  });
  return { repo, service, events };
}

describe('作る', () => {
  test('題名の前後の空白を除き、todo・版 1・今の時刻で作って、task.created を知らせる', async () => {
    const { service, events } = setup();
    const task = await service.create({ title: '  牛乳を買う ' });
    assert.deepEqual(task, {
      id: 1,
      title: '牛乳を買う',
      status: 'todo',
      dueDate: null,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      completedAt: null,
      version: 1,
    });
    assert.deepEqual(events, ['task.created:1']);
  });

  // 境目の値を表にして並べる（第56章 3節）
  const titles: [string, boolean][] = [
    ['', false],
    ['   ', false],
    ['a', true],
    ['あ'.repeat(100), true],
    ['あ'.repeat(101), false],
  ];
  for (const [title, ok] of titles) {
    test(`題名が ${title.length} 文字（${JSON.stringify(title.slice(0, 3))}…）なら ${ok ? '作れる' : 'ValidationError'}`, async () => {
      const { service } = setup();
      if (ok) await service.create({ title });
      else await assert.rejects(service.create({ title }), ValidationError);
    });
  }

  test('期限は、日本時間の今日なら作れ、昨日なら ValidationError（UTC の日付で比べない）', async () => {
    const { service } = setup();
    await service.create({ title: 'a', dueDate: '2026-12-10' });
    await assert.rejects(service.create({ title: 'b', dueDate: '2026-12-09' }), ValidationError);
  });

  test('終わっていない同じ題名があれば ConflictError で、知らせない', async () => {
    const { service, events } = setup([aTask({ title: '牛乳を買う' })]);
    await assert.rejects(service.create({ title: '牛乳を買う' }), ConflictError);
    assert.deepEqual(events, []);
  });
});

describe('変える', () => {
  test('作業中は maxDoing 個まで。超えると ConflictError で、変わらない', async () => {
    const { service, repo } = setup(
      [
        aTask({ id: 1, title: 'a', status: 'doing' }),
        aTask({ id: 2, title: 'b', status: 'doing' }),
        aTask({ id: 3, title: 'c' }),
      ],
      { maxDoing: 2 },
    );
    await assert.rejects(service.update(3, { status: 'doing' }), ConflictError);
    assert.equal((await repo.get(3))?.status, 'todo');
  });

  test('done にすると completedAt が付き、版が1つ上がり、task.updated を知らせる', async () => {
    const { service, events } = setup([aTask()]);
    const task = await service.update(1, { status: 'done' });
    assert.equal(task.completedAt, NOW.toISOString());
    assert.equal(task.version, 2);
    assert.deepEqual(events, ['task.updated:1']);
  });

  test('完了したタスクの題名は変えられない。status を戻すのと一緒なら変えられる', async () => {
    const { service } = setup([aTask({ status: 'done', completedAt: '2026-12-02T00:00:00.000Z' })]);
    await assert.rejects(service.update(1, { title: '新しい題名' }), ConflictError);
    const task = await service.update(1, { title: '新しい題名', status: 'todo' });
    assert.deepEqual([task.title, task.status, task.completedAt], ['新しい題名', 'todo', null]);
  });

  test('何も変わらなければ、版を上げず、知らせない', async () => {
    const { service, events } = setup([aTask({ title: 'a' })]);
    const task = await service.update(1, { title: ' a ' });
    assert.equal(task.version, 1);
    assert.deepEqual(events, []);
  });

  test('客が見ていた版が古ければ PreconditionFailedError', async () => {
    const { service } = setup([aTask({ version: 3 })]);
    await assert.rejects(service.update(1, { title: 'b' }, { expectedVersion: 2 }), PreconditionFailedError);
  });

  test('知らない status は ValidationError', async () => {
    const { service } = setup([aTask()]);
    await assert.rejects(service.update(1, { status: 'later' }), ValidationError);
  });
});

describe('消す・読む', () => {
  test('消すと task.deleted を知らせ、もう読めない', async () => {
    const { service, events } = setup([aTask()]);
    await service.remove(1);
    assert.deepEqual(events, ['task.deleted:1']);
    await assert.rejects(service.get(1), NotFoundError);
  });

  test('無いタスクは NotFoundError', async () => {
    const { service } = setup();
    await assert.rejects(service.update(9, { title: 'a' }), NotFoundError);
    await assert.rejects(service.remove(9), NotFoundError);
  });
});
