// サービスの層だけを確かめるテスト（第26章 4節）。HTTP もサーバも使わない
//   $ node --test task-service.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictError, ValidationError } from './errors.mjs';
import { createMemoryTaskRepo } from './repositories/memory-task-repo.mjs';
import { createTaskService } from './services/task-service.mjs';

/** 時計を決めたサービスを作る。本物の new Date() を使わないので、いつ動かしても同じ結果になる */
function setup({ now = '2026-11-05T09:00:00.000Z', maxTasks } = {}) {
  const repo = createMemoryTaskRepo();
  const service = createTaskService({ repo, clock: () => new Date(now), maxTasks });
  return { repo, service };
}

test('作ると、時計の時刻が createdAt に入る', async () => {
  const { service } = setup();
  const t = await service.create({ title: '  牛乳 ' });
  assert.deepEqual(t, { id: 1, title: '牛乳', status: 'todo', dueDate: null, createdAt: '2026-11-05T09:00:00.000Z' });
});

test('締め切りが昨日なら ValidationError、今日ならよい', async () => {
  const { service } = setup();
  await assert.rejects(service.create({ title: 'a', dueDate: '2026-11-04' }), ValidationError);
  assert.equal((await service.create({ title: 'b', dueDate: '2026-11-05' })).dueDate, '2026-11-05');
});

test('同じ題名の、終わっていないタスクは ConflictError', async () => {
  const { service } = setup();
  await service.create({ title: '牛乳' });
  await assert.rejects(service.create({ title: '牛乳' }), ConflictError);
});

test('上限の数を超えると ConflictError（上限は外から渡せる）', async () => {
  const { service } = setup({ maxTasks: 2 });
  await service.create({ title: 'a' });
  await service.create({ title: 'b' });
  await assert.rejects(service.create({ title: 'c' }), /2 個まで/);
});
