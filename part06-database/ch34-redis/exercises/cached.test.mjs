// 練習問題2 用: cached.mjs のテスト（Redis が動いている必要がある）
// 使い方: node --test cached.test.mjs
//   模範解答を試す: MODULE=../solutions/cached.mjs node --test cached.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTestRedis } from './redis-test.mjs';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './cached.mjs')).href);

// 呼ばれた回数を数える loader を作る
function counting(value) {
  const loader = async () => {
    loader.calls += 1;
    return typeof value === 'function' ? value() : value;
  };
  loader.calls = 0;
  return loader;
}

test('1回目は loader を呼び、2回目からはキャッシュ', async (t) => {
  const { redis, prefix } = await createTestRedis(t);
  const loader = counting([{ id: 2, title: '本を返す' }]);
  assert.deepEqual(await m.cached(redis, `${prefix}tasks`, 60, loader), [{ id: 2, title: '本を返す' }]);
  assert.deepEqual(await m.cached(redis, `${prefix}tasks`, 60, loader), [{ id: 2, title: '本を返す' }]);
  assert.deepEqual(await m.cached(redis, `${prefix}tasks`, 60, loader), [{ id: 2, title: '本を返す' }]);
  assert.equal(loader.calls, 1);
});

test('ttlSec の期限が付き、キーを消せば、また loader を呼ぶ', async (t) => {
  const { redis, prefix } = await createTestRedis(t);
  let n = 0;
  const loader = counting(() => ++n);
  assert.equal(await m.cached(redis, `${prefix}n`, 30, loader), 1);
  const ttl = await redis.ttl(`${prefix}n`);
  assert.ok(ttl > 25 && ttl <= 30, `TTL: ${ttl}`);
  await redis.del(`${prefix}n`);
  assert.equal(await m.cached(redis, `${prefix}n`, 30, loader), 2);
  assert.equal(loader.calls, 2);
});

test('期限が来たら、また loader を呼ぶ', async (t) => {
  const { redis, prefix } = await createTestRedis(t);
  let n = 0;
  const loader = counting(() => ++n);
  assert.equal(await m.cached(redis, `${prefix}n`, 1, loader), 1);
  assert.equal(await m.cached(redis, `${prefix}n`, 1, loader), 1);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  assert.equal(await m.cached(redis, `${prefix}n`, 1, loader), 2);
});

test('0・空の文字列・false・null もキャッシュする', async (t) => {
  const { redis, prefix } = await createTestRedis(t);
  for (const [i, value] of [0, '', false, null].entries()) {
    const loader = counting(value);
    assert.equal(await m.cached(redis, `${prefix}v${i}`, 60, loader), value);
    assert.equal(await m.cached(redis, `${prefix}v${i}`, 60, loader), value);
    assert.equal(loader.calls, 1, `${JSON.stringify(value)} が2回読まれました`);
  }
});

test('loader が例外なら、そのまま投げて、何もキャッシュしない。undefined も入れない', async (t) => {
  const { redis, prefix } = await createTestRedis(t);
  await assert.rejects(
    m.cached(redis, `${prefix}x`, 60, async () => {
      throw new Error('データベースが止まっています');
    }),
    /データベースが止まっています/,
  );
  assert.equal(await redis.exists(`${prefix}x`), 0);
  assert.equal(await m.cached(redis, `${prefix}u`, 60, async () => undefined), undefined);
  assert.equal(await redis.exists(`${prefix}u`), 0);
});
