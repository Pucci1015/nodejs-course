// 練習問題3のテスト。HTTP もサーバも使わず、サービスの層だけを確かめる
// 使い方: node --test task-service.test.mjs
//         MODULE=../solutions/task-service.mjs node --test task-service.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = path.dirname(path.resolve(import.meta.dirname, process.env.MODULE ?? './task-service.mjs'));
const { createTaskService } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './task-service.mjs')).href);
const { createMemoryTaskRepo } = await import(pathToFileURL(path.join(dir, 'memory-task-repo.mjs')).href);
const { ConflictError, NotFoundError, ValidationError } = await import(pathToFileURL(path.join(dir, 'errors.mjs')).href);

/** 進められる時計。本物の時刻を使わないので、いつ動かしても同じ結果になる */
function fakeClock(iso) {
  let t = Date.parse(iso);
  const clock = () => new Date(t);
  clock.advance = (ms) => {
    t += ms;
  };
  return clock;
}

function setup({ now = '2026-11-05T03:00:00.000Z', maxDoing } = {}) {
  const repo = createMemoryTaskRepo();
  const clock = fakeClock(now);
  return { repo, clock, service: createTaskService({ repo, clock, maxDoing }) };
}

test('1. 作る: 空白を取り、時刻は clock から。version は 1', async () => {
  const { service } = setup();
  const t = await service.create({ title: '  牛乳  ' });
  assert.deepEqual(t, {
    id: 1,
    title: '牛乳',
    status: 'todo',
    dueDate: null,
    createdAt: '2026-11-05T03:00:00.000Z',
    updatedAt: '2026-11-05T03:00:00.000Z',
    completedAt: null,
    version: 1,
  });
});

test('2. title は 1〜100 文字（ValidationError と field）', async () => {
  const { service } = setup();
  for (const title of ['', '   ', 'あ'.repeat(101), undefined, 5]) {
    await assert.rejects(service.create({ title }), (e) => e instanceof ValidationError && e.field === 'title');
  }
});

test('3. 締め切りの「今日」は日本の日付（UTC の 20 時は、日本では次の日の朝 5 時）', async () => {
  const { service } = setup({ now: '2026-11-05T20:00:00.000Z' }); // 日本は 11 月 6 日
  await assert.rejects(service.create({ title: 'a', dueDate: '2026-11-05' }), (e) => e instanceof ValidationError && e.field === 'dueDate');
  assert.equal((await service.create({ title: 'b', dueDate: '2026-11-06' })).dueDate, '2026-11-06');
});

test('4. 同じ題名の、終わっていないタスクは ConflictError。終わったものとは重なってよい', async () => {
  const { service } = setup();
  const a = await service.create({ title: '牛乳' });
  await assert.rejects(service.create({ title: '牛乳' }), ConflictError);
  await service.update(a.id, { status: 'done' });
  assert.equal((await service.create({ title: '牛乳' })).id, 2);
});

test('5. 無いものは NotFoundError（get・update・remove）', async () => {
  const { service } = setup();
  await assert.rejects(service.get(9), NotFoundError);
  await assert.rejects(service.update(9, { title: 'x' }), NotFoundError);
  await assert.rejects(service.remove(9), NotFoundError);
});

test('6. 変える: updatedAt と version が進む。何も変わらなければ、そのまま', async () => {
  const { service, clock } = setup();
  const t = await service.create({ title: '牛乳' });
  clock.advance(60_000);
  const u = await service.update(t.id, { title: '豆乳' });
  assert.equal(u.title, '豆乳');
  assert.equal(u.version, 2);
  assert.equal(u.updatedAt, '2026-11-05T03:01:00.000Z');
  assert.equal(u.createdAt, '2026-11-05T03:00:00.000Z');
  const same = await service.update(t.id, { title: '豆乳' });
  assert.equal(same.version, 2);
});

test('7. done にすると completedAt が入り、戻すと null', async () => {
  const { service, clock } = setup();
  const t = await service.create({ title: 'a' });
  clock.advance(5_000);
  assert.equal((await service.update(t.id, { status: 'done' })).completedAt, '2026-11-05T03:00:05.000Z');
  assert.equal((await service.update(t.id, { status: 'todo' })).completedAt, null);
});

test('8. 完了したタスクは、status を戻すとき以外は変えられない', async () => {
  const { service } = setup();
  const t = await service.create({ title: 'a' });
  await service.update(t.id, { status: 'done' });
  await assert.rejects(service.update(t.id, { title: 'b' }), ConflictError);
  const reopened = await service.update(t.id, { status: 'todo', title: 'b' });
  assert.equal(reopened.title, 'b');
});

test('9. 作業中（doing）は同時に maxDoing 個まで', async () => {
  const { service } = setup({ maxDoing: 2 });
  const ids = [];
  for (const title of ['a', 'b', 'c']) ids.push((await service.create({ title })).id);
  await service.update(ids[0], { status: 'doing' });
  await service.update(ids[1], { status: 'doing' });
  await assert.rejects(service.update(ids[2], { status: 'doing' }), ConflictError);
  await service.update(ids[0], { status: 'done' });
  assert.equal((await service.update(ids[2], { status: 'doing' })).status, 'doing');
});

test('10. status の値の間違いは ValidationError', async () => {
  const { service } = setup();
  const t = await service.create({ title: 'a' });
  await assert.rejects(service.update(t.id, { status: 'later' }), (e) => e instanceof ValidationError && e.field === 'status');
});

test('11. 締め切りを過ぎたタスクも、締め切りを変えなければ題名を変えられる', async () => {
  const { service, clock } = setup();
  const t = await service.create({ title: 'a', dueDate: '2026-11-05' });
  clock.advance(2 * 24 * 60 * 60_000); // 2日後
  assert.equal((await service.update(t.id, { title: 'b', dueDate: '2026-11-05' })).title, 'b');
  await assert.rejects(service.update(t.id, { dueDate: '2026-11-06' }), ValidationError); // 過去の日付に変えるのはだめ
});

test('12. 一覧: status で絞り込み、id の順。消すと一覧から消える', async () => {
  const { service } = setup();
  for (const title of ['a', 'b', 'c']) await service.create({ title });
  await service.update(2, { status: 'done' });
  assert.deepEqual((await service.list({ status: 'todo' })).map((t) => t.id), [1, 3]);
  await service.remove(1);
  assert.deepEqual((await service.list()).map((t) => t.id), [2, 3]);
});
