// 練習問題3 用: hit.mjs のテスト（Redis が動いている必要がある）
// 使い方: node --test hit.test.mjs
//   模範解答を試す: MODULE=../solutions/hit.mjs node --test hit.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTestRedis } from './redis-test.mjs';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './hit.mjs')).href);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('limit 回までは allowed: true、超えたら false。remaining は 0 より下にならない', async (t) => {
  const { redis, prefix } = await createTestRedis(t);
  const results = [];
  for (let i = 0; i < 5; i++) results.push(await m.hit(redis, `${prefix}alice`, { limit: 3, windowSec: 60 }));
  assert.deepEqual(
    results.map((r) => [r.allowed, r.remaining]),
    [
      [true, 2],
      [true, 1],
      [true, 0],
      [false, 0],
      [false, 0],
    ],
  );
  assert.ok(results.every((r) => r.retryAfter > 55 && r.retryAfter <= 60), JSON.stringify(results));
  assert.equal((await m.hit(redis, `${prefix}bob`, { limit: 3, windowSec: 60 })).allowed, true, 'キーが違えば別に数える');
});

test('同時に 20 回来ても、通すのはちょうど limit 回', async (t) => {
  const { redis, prefix } = await createTestRedis(t);
  const results = await Promise.all(Array.from({ length: 20 }, () => m.hit(redis, `${prefix}k`, { limit: 5, windowSec: 60 })));
  assert.equal(results.filter((r) => r.allowed).length, 5);
});

test('窓は最初の1回から数える（来るたびに延びない）。窓が終われば、また通す', async (t) => {
  const { redis, prefix } = await createTestRedis(t);
  const opts = { limit: 2, windowSec: 2 };
  await m.hit(redis, `${prefix}k`, opts);
  await sleep(1100);
  const second = await m.hit(redis, `${prefix}k`, opts);
  assert.equal(second.retryAfter, 1, '2回目で期限を付け直しています');
  assert.equal((await m.hit(redis, `${prefix}k`, opts)).allowed, false);
  await sleep(1200);
  assert.deepEqual(await m.hit(redis, `${prefix}k`, opts), { allowed: true, remaining: 1, retryAfter: 2 });
});

test('期限の無いキーが残っていても、期限を付ける', async (t) => {
  const { redis, prefix } = await createTestRedis(t);
  await redis.set(`${prefix}k`, '7'); // 前に、期限を付ける前に止まってしまった、と考える
  const r = await m.hit(redis, `${prefix}k`, { limit: 3, windowSec: 60 });
  assert.equal(r.allowed, false);
  assert.ok(r.retryAfter > 0, `TTL: ${r.retryAfter}`);
});
