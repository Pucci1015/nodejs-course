// 練習問題8 用: redis-rate-limit.mjs のテスト（Redis が動いている必要がある）
// 使い方: node --test redis-rate-limit.test.mjs
//   模範解答を試す: MODULE=../solutions/redis-rate-limit.mjs node --test redis-rate-limit.test.mjs
// サーバ2台の代わりに、別々の接続を持つ Express のアプリを2つ動かして確かめる（ポートは空いている番号を自動で使う）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { createTestRedis } from './redis-test.mjs';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './redis-rate-limit.mjs')).href);

// アプリを動かして、そのアドレスを返す。テストが終わったら止める
async function startApp(t, limiter) {
  const app = express();
  app.use('/login', limiter);
  app.all('/login', (req, res) => res.json({ ok: true }));
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('limit 回までは通し、超えたら 429 と Retry-After。見出しで残りを知らせる', async (t) => {
  const { redis, prefix } = await createTestRedis(t);
  const base = await startApp(t, m.redisRateLimit({ redis, limit: 2, windowSec: 60, prefix }));
  const r1 = await fetch(`${base}/login`, { method: 'POST' });
  assert.equal(r1.status, 200);
  assert.equal(r1.headers.get('ratelimit-limit'), '2');
  assert.equal(r1.headers.get('ratelimit-remaining'), '1');
  const reset = Number(r1.headers.get('ratelimit-reset'));
  assert.ok(reset > 55 && reset <= 60, `RateLimit-Reset: ${reset}`);
  assert.equal((await fetch(`${base}/login`, { method: 'POST' })).status, 200);
  const r3 = await fetch(`${base}/login`, { method: 'POST' });
  assert.equal(r3.status, 429);
  assert.equal(r3.headers.get('ratelimit-remaining'), '0');
  assert.ok(Number(r3.headers.get('retry-after')) > 55);
  assert.deepEqual(await r3.json(), { error: 'too many requests' });
});

test('サーバが2台でも、合わせて数える', async (t) => {
  const { redis, prefix, newClient } = await createTestRedis(t);
  const options = { limit: 3, windowSec: 60, prefix };
  const base1 = await startApp(t, m.redisRateLimit({ redis, ...options }));
  const base2 = await startApp(t, m.redisRateLimit({ redis: await newClient(), ...options }));
  const statuses = [];
  for (const base of [base1, base2, base1, base2, base1]) statuses.push((await fetch(`${base}/login`, { method: 'POST' })).status);
  assert.deepEqual(statuses, [200, 200, 200, 429, 429]);
});

test('key で数える相手を分ける。OPTIONS は数えない', async (t) => {
  const { redis, prefix } = await createTestRedis(t);
  const key = (req) => req.get('x-user') ?? 'anonymous';
  const base = await startApp(t, m.redisRateLimit({ redis, limit: 1, windowSec: 60, prefix, key }));
  const post = (user) => fetch(`${base}/login`, { method: 'POST', headers: { 'x-user': user } }).then((r) => r.status);
  for (let i = 0; i < 3; i++) assert.equal((await fetch(`${base}/login`, { method: 'OPTIONS', headers: { 'x-user': 'alice' } })).status, 200);
  assert.equal(await post('alice'), 200);
  assert.equal(await post('alice'), 429);
  assert.equal(await post('bob'), 200);
  assert.ok(await redis.exists(`${prefix}alice`), 'キーは prefix + key(req)');
});

test('Redis が使えないときは、制限せずに通す', async (t) => {
  const { newClient } = await createTestRedis(t);
  const broken = await newClient();
  await broken.close();
  const base = await startApp(t, m.redisRateLimit({ redis: broken, limit: 1, windowSec: 60 }));
  const original = console.error;
  console.error = () => {}; // テストの表示を汚さないように、エラーのログを止めておく
  t.after(() => (console.error = original));
  assert.equal((await fetch(`${base}/login`, { method: 'POST' })).status, 200);
  assert.equal((await fetch(`${base}/login`, { method: 'POST' })).status, 200);
});

test('設定のまちがいは、作る時点で TypeError', async (t) => {
  const { redis } = await createTestRedis(t);
  for (const bad of [{ limit: 0, windowSec: 60 }, { limit: 1.5, windowSec: 60 }, { limit: 5, windowSec: 0 }, { limit: 5 }]) {
    assert.throws(() => m.redisRateLimit({ redis, ...bad }), TypeError, JSON.stringify(bad));
  }
});
