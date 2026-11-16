// 練習問題5 用: session-store.mjs のテスト（Redis が動いている必要がある）
// 使い方: node --test session-store.test.mjs
//   模範解答を試す: MODULE=../solutions/session-store.mjs node --test session-store.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTestRedis } from './redis-test.mjs';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './session-store.mjs')).href);

async function setup(t, ttlSec = 100) {
  const { redis, prefix } = await createTestRedis(t);
  return { redis, prefix, store: m.createSessionStore(redis, { ttlSec, prefix: `${prefix}sess:` }) };
}

test('create: 43 文字の推測できない ID。中身は prefix + ID のキーに、期限付きで入る', async (t) => {
  const { redis, prefix, store } = await setup(t);
  const a = await store.create({ name: 'alice' });
  const b = await store.create({ name: 'alice' });
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(a, b);
  assert.deepEqual(JSON.parse(await redis.get(`${prefix}sess:${a}`)), { name: 'alice' });
  const ttl = await redis.ttl(`${prefix}sess:${a}`);
  assert.ok(ttl > 95 && ttl <= 100, `TTL: ${ttl}`);
});

test('get: 中身を返し、期限を ttlSec に戻す。無い ID・変な ID は null', async (t) => {
  const { redis, prefix, store } = await setup(t);
  const id = await store.create({ name: 'bob', cart: [1, 2] });
  await redis.expire(`${prefix}sess:${id}`, 10); // 時間がたって、残りが 10 秒になった、と考える
  assert.deepEqual(await store.get(id), { name: 'bob', cart: [1, 2] });
  const ttl = await redis.ttl(`${prefix}sess:${id}`);
  assert.ok(ttl > 95, `使ったのに期限が延びていません（TTL: ${ttl}）`);
  for (const bad of ['no-such-id', '', undefined, null, 42]) {
    assert.equal(await store.get(bad), null, String(bad));
  }
  assert.equal(await redis.exists(`${prefix}sess:no-such-id`), 0, '無い ID のキーを作らない');
});

test('期限が切れたら null', async (t) => {
  const { store } = await setup(t, 1);
  const id = await store.create({ name: 'carol' });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  assert.equal(await store.get(id), null);
});

test('save: あれば置き換えて true。無い（消えた）セッションは作らずに false', async (t) => {
  const { redis, prefix, store } = await setup(t);
  const id = await store.create({ name: 'dave', n: 1 });
  await redis.expire(`${prefix}sess:${id}`, 10);
  assert.equal(await store.save(id, { name: 'dave', n: 2 }), true);
  assert.deepEqual(await store.get(id), { name: 'dave', n: 2 });
  assert.ok((await redis.ttl(`${prefix}sess:${id}`)) > 95);
  await store.destroy(id);
  assert.equal(await store.save(id, { name: 'dave', n: 3 }), false);
  assert.equal(await store.get(id), null);
  assert.equal(await store.save('', {}), false);
});

test('regenerate: 中身はそのまま新しい ID に。古い ID は使えない。無ければ null', async (t) => {
  const { store } = await setup(t);
  const oldId = await store.create({ name: 'eve' });
  const newId = await store.regenerate(oldId);
  assert.match(newId, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(newId, oldId);
  assert.deepEqual(await store.get(newId), { name: 'eve' });
  assert.equal(await store.get(oldId), null);
  assert.equal(await store.regenerate(oldId), null);
  await store.destroy(newId);
  assert.equal(await store.get(newId), null);
  await store.destroy(undefined); // 変な ID でも例外にしない
});
