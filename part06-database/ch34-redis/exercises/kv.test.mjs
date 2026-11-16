// 練習問題1 用: kv.mjs のテスト（Redis が動いている必要がある）
// 使い方: node --test kv.test.mjs
//   模範解答を試す: MODULE=../solutions/kv.mjs node --test kv.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTestRedis } from './redis-test.mjs';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './kv.mjs')).href);

test('setJson と getJson: オブジェクト・配列・null がそのまま戻る', async (t) => {
  const { redis, prefix } = await createTestRedis(t);
  const task = { id: 2, title: "Let's ストレッチ", tags: ['家'], dueDate: null };
  await m.setJson(redis, `${prefix}task:2`, task);
  assert.deepEqual(await m.getJson(redis, `${prefix}task:2`), task);
  assert.equal(await redis.get(`${prefix}task:2`), JSON.stringify(task), 'Redis には JSON の文字列で入れる');
  await m.setJson(redis, `${prefix}nothing`, null);
  assert.equal(await m.getJson(redis, `${prefix}nothing`), null);
  assert.equal(await m.getJson(redis, `${prefix}no-such-key`), undefined, '無いキーは undefined');
});

test('setJson: ttlSec を渡したときだけ期限が付く', async (t) => {
  const { redis, prefix } = await createTestRedis(t);
  await m.setJson(redis, `${prefix}a`, 1, 30);
  const ttl = await redis.ttl(`${prefix}a`);
  assert.ok(ttl > 25 && ttl <= 30, `TTL: ${ttl}`);
  await m.setJson(redis, `${prefix}b`, 1);
  assert.equal(await redis.ttl(`${prefix}b`), -1);
});

test('countUp: 1, 2, 3 … を number で。同時に 50 回でも数えもれない', async (t) => {
  const { redis, prefix } = await createTestRedis(t);
  assert.equal(await m.countUp(redis, `${prefix}n`), 1);
  assert.equal(await m.countUp(redis, `${prefix}n`), 2);
  await Promise.all(Array.from({ length: 50 }, () => m.countUp(redis, `${prefix}n`)));
  assert.equal(await redis.get(`${prefix}n`), '52');
});

test('secondsLeft: 秒数・Infinity・null', async (t) => {
  const { redis, prefix } = await createTestRedis(t);
  await redis.setEx(`${prefix}otp`, 60, 'x');
  const left = await m.secondsLeft(redis, `${prefix}otp`);
  assert.ok(left > 55 && left <= 60, `${left}`);
  await redis.set(`${prefix}forever`, 'x');
  assert.equal(await m.secondsLeft(redis, `${prefix}forever`), Infinity);
  assert.equal(await m.secondsLeft(redis, `${prefix}no-such-key`), null);
});
