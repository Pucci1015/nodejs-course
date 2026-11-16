// 練習問題6 用: cached-repo.mjs のテスト（Redis が動いている必要がある）
// 使い方: node --test cached-repo.test.mjs
//   模範解答を試す: MODULE=../solutions/cached-repo.mjs node --test cached-repo.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTestRedis } from './redis-test.mjs';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './cached-repo.mjs')).href);

// データベースの代わりのリポジトリ。呼ばれた回数を calls に数える
function fakeRepo() {
  const rows = new Map([
    [2, { id: 2, title: '本を返す', version: 1 }],
    [5, { id: 5, title: '報告書を書く', version: 1 }],
  ]);
  let nextId = 6;
  const calls = { list: 0, get: 0 };
  return {
    calls,
    async list() {
      calls.list += 1;
      return [...rows.values()].map((r) => ({ ...r }));
    },
    async get(id) {
      calls.get += 1;
      return rows.has(id) ? { ...rows.get(id) } : null;
    },
    async insert(fields) {
      const row = { id: nextId++, version: 1, ...fields };
      rows.set(row.id, row);
      return { ...row };
    },
    async update(id, fields, { expectedVersion } = {}) {
      const row = rows.get(id);
      if (!row || (expectedVersion !== undefined && row.version !== expectedVersion)) return null;
      Object.assign(row, fields, { version: row.version + 1 });
      return { ...row };
    },
    async remove(id) {
      return rows.delete(id);
    },
  };
}

async function setup(t) {
  const { redis, prefix } = await createTestRedis(t);
  const repo = fakeRepo();
  return { redis, prefix, repo, cachedRepo: m.createCachedRepo(repo, redis, { prefix, ttlSec: 60 }) };
}

test('list と get: 2回目からはキャッシュ（リポジトリを呼ばない）', async (t) => {
  const { redis, prefix, repo, cachedRepo } = await setup(t);
  const first = await cachedRepo.list();
  assert.deepEqual(await cachedRepo.list(), first);
  assert.equal(repo.calls.list, 1);
  assert.deepEqual(await cachedRepo.get(2), { id: 2, title: '本を返す', version: 1 });
  assert.deepEqual(await cachedRepo.get(2), { id: 2, title: '本を返す', version: 1 });
  assert.equal(repo.calls.get, 1);
  assert.ok(await redis.exists(`${prefix}tasks`), 'キャッシュのキーは prefix + "tasks"');
  assert.ok(await redis.exists(`${prefix}task:2`), 'キャッシュのキーは prefix + "task:" + id');
  const ttl = await redis.ttl(`${prefix}tasks`);
  assert.ok(ttl > 55 && ttl <= 60, `TTL: ${ttl}`);
});

test('get: 無いタスク（null）はキャッシュしない', async (t) => {
  const { redis, prefix, repo, cachedRepo } = await setup(t);
  assert.equal(await cachedRepo.get(99), null);
  assert.equal(await cachedRepo.get(99), null);
  assert.equal(repo.calls.get, 2);
  assert.equal(await redis.exists(`${prefix}task:99`), 0);
});

test('insert: 一覧のキャッシュを消す', async (t) => {
  const { repo, cachedRepo } = await setup(t);
  await cachedRepo.list();
  const task = await cachedRepo.insert({ title: '窓を拭く' });
  assert.equal(task.id, 6);
  assert.deepEqual((await cachedRepo.list()).map((x) => x.title), ['本を返す', '報告書を書く', '窓を拭く']);
  assert.equal(repo.calls.list, 2);
});

test('update: 一覧と、そのタスクのキャッシュを消す。変わらなかったら消さない', async (t) => {
  const { repo, cachedRepo } = await setup(t);
  await cachedRepo.list();
  await cachedRepo.get(2);
  await cachedRepo.get(5);
  assert.equal(await cachedRepo.update(2, { title: '図書館に本を返す' }, { expectedVersion: 9 }), null);
  await cachedRepo.list();
  await cachedRepo.get(2);
  assert.deepEqual([repo.calls.list, repo.calls.get], [1, 2], 'version が合わず変わらなかったのに、キャッシュを消しています');
  assert.equal((await cachedRepo.update(2, { title: '図書館に本を返す' }, { expectedVersion: 1 })).version, 2);
  assert.equal((await cachedRepo.get(2)).title, '図書館に本を返す');
  assert.equal((await cachedRepo.list())[0].title, '図書館に本を返す');
  await cachedRepo.get(5);
  assert.deepEqual([repo.calls.list, repo.calls.get], [2, 3], 'タスク 5 のキャッシュは消さなくてよい');
});

test('remove: 一覧と、そのタスクのキャッシュを消す', async (t) => {
  const { cachedRepo } = await setup(t);
  await cachedRepo.list();
  await cachedRepo.get(5);
  assert.equal(await cachedRepo.remove(5), true);
  assert.equal(await cachedRepo.get(5), null);
  assert.deepEqual((await cachedRepo.list()).map((x) => x.id), [2]);
  assert.equal(await cachedRepo.remove(5), false);
});
