// 練習問題7 用: broadcaster.mjs のテスト（Redis が動いている必要がある）
// 使い方: node --test broadcaster.test.mjs
//   模範解答を試す: MODULE=../solutions/broadcaster.mjs node --test broadcaster.test.mjs
// 2つのプロセスの代わりに、別々の接続を2本作って確かめる
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTestRedis } from './redis-test.mjs';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './broadcaster.mjs')).href);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function setup(t) {
  const { redis, prefix, newClient } = await createTestRedis(t);
  const channel = `${prefix}events`;
  const a = m.createBroadcaster(redis, channel); // 1台目のサーバ
  const b = m.createBroadcaster(await newClient(), channel); // 2台目のサーバ
  return { redis, prefix, channel, a, b };
}

test('別の接続で subscribe したところに、オブジェクトのまま届く', async (t) => {
  const { a, b } = await setup(t);
  const got = [];
  const stop = await b.subscribe((event) => got.push(event));
  t.after(stop);
  assert.equal(typeof stop, 'function', 'subscribe は、止める関数を返す');
  assert.equal(await a.publish({ type: 'task.created', id: 6, title: "Let's ストレッチ" }), 1);
  assert.equal(await a.publish({ type: 'task.deleted', id: 2 }), 1);
  await sleep(100);
  assert.deepEqual(got, [
    { type: 'task.created', id: 6, title: "Let's ストレッチ" },
    { type: 'task.deleted', id: 2 },
  ]);
});

test('subscribe した後も、渡した redis で、ふつうのコマンドを送れる', async (t) => {
  const { redis, prefix, a } = await setup(t);
  const got = [];
  const stop = await a.subscribe((event) => got.push(event));
  t.after(stop);
  await redis.set(`${prefix}k`, 'v');
  assert.equal(await redis.get(`${prefix}k`), 'v');
  assert.equal(await a.publish({ n: 1 }), 1, '自分にも届く');
  await sleep(100);
  assert.deepEqual(got, [{ n: 1 }]);
});

test('止めたら届かない。だれも待っていなければ publish は 0', async (t) => {
  const { a, b } = await setup(t);
  const got = [];
  const stop = await b.subscribe((event) => got.push(event));
  await stop();
  assert.equal(await a.publish({ n: 1 }), 0);
  await sleep(100);
  assert.deepEqual(got, []);
});

test('JSON でない知らせは、handler に渡さずに捨てる', async (t) => {
  const { redis, channel, b } = await setup(t);
  const got = [];
  const stop = await b.subscribe((event) => got.push(event));
  t.after(stop);
  await redis.publish(channel, 'これは JSON ではない');
  await redis.publish(channel, '{"ok":true}');
  await sleep(100);
  assert.deepEqual(got, [{ ok: true }]);
});
