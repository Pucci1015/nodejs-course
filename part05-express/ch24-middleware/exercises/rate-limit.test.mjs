// 練習問題5のテスト
// 使い方: node --test rate-limit.test.mjs
//         MODULE=../solutions/rate-limit.mjs node --test rate-limit.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';

const { rateLimit } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './rate-limit.mjs')).href);

/** 時計を自由に進められるアプリを作る。客は X-Client ヘッダで見分ける */
async function setup(options = {}) {
  const clock = { t: 1_000_000 };
  const limiter = rateLimit({ windowMs: 10_000, limit: 3, key: (req) => req.get('x-client') ?? 'anon', now: () => clock.t, ...options });
  const app = express();
  app.use(limiter);
  app.all('/', (req, res) => res.send('ok'));
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const hit = async (client = 'a', method = 'GET') => {
    const res = await fetch(`${base}/`, { method, headers: { 'x-client': client }, signal: AbortSignal.timeout(2000) });
    const text = await res.text();
    const h = (n) => res.headers.get(n);
    return { status: res.status, text, limit: h('ratelimit-limit'), remaining: h('ratelimit-remaining'), reset: h('ratelimit-reset'), retry: h('retry-after'), type: h('content-type') ?? '' };
  };
  const close = () => {
    server.closeAllConnections();
    server.close();
  };
  return { clock, limiter, hit, close };
}

test('1. 上限までは通し、RateLimit-Limit・RateLimit-Remaining を付ける', async () => {
  const s = await setup();
  try {
    const rs = [await s.hit(), await s.hit(), await s.hit()];
    assert.deepEqual(rs.map((r) => r.status), [200, 200, 200]);
    assert.deepEqual(rs.map((r) => r.limit), ['3', '3', '3']);
    assert.deepEqual(rs.map((r) => r.remaining), ['2', '1', '0']);
  } finally {
    s.close();
  }
});

test('2. 上限を超えたら 429 と JSON、Retry-After（秒、切り上げ）。ハンドラは動かない', async () => {
  const s = await setup();
  try {
    for (let i = 0; i < 3; i++) await s.hit();
    s.clock.t += 2_500;
    const r = await s.hit();
    assert.equal(r.status, 429);
    assert.ok(r.type.startsWith('application/json'));
    assert.equal(JSON.parse(r.text).error, 'too_many_requests');
    assert.equal(r.retry, '8'); // 残り 7.5 秒 → 8
    assert.equal(r.remaining, '0');
    assert.notEqual(r.text, 'ok');
  } finally {
    s.close();
  }
});

test('3. RateLimit-Reset は、窓が終わるまでの秒数（切り上げ）', async () => {
  const s = await setup();
  try {
    assert.equal((await s.hit()).reset, '10');
    s.clock.t += 4_001;
    assert.equal((await s.hit()).reset, '6');
  } finally {
    s.close();
  }
});

test('4. 窓が終わったら、数え直す', async () => {
  const s = await setup();
  try {
    for (let i = 0; i < 4; i++) await s.hit();
    s.clock.t += 10_000;
    const r = await s.hit();
    assert.equal(r.status, 200);
    assert.equal(r.remaining, '2');
  } finally {
    s.close();
  }
});

test('5. 客（key）ごとに数える', async () => {
  const s = await setup();
  try {
    for (let i = 0; i < 4; i++) await s.hit('a');
    assert.equal((await s.hit('a')).status, 429);
    assert.equal((await s.hit('b')).status, 200);
  } finally {
    s.close();
  }
});

test('6. OPTIONS（CORS のプリフライト）は数えない', async () => {
  const s = await setup();
  try {
    for (let i = 0; i < 5; i++) await s.hit('a', 'OPTIONS');
    assert.equal((await s.hit('a')).remaining, '2');
  } finally {
    s.close();
  }
});

test('7. 終わった窓の記録は消し、覚える量がふくらみ続けない', async () => {
  const s = await setup();
  try {
    for (let i = 0; i < 20; i++) await s.hit(`client-${i}`);
    assert.equal(s.limiter.size(), 20);
    s.clock.t += 10_001;
    await s.hit('new');
    assert.equal(s.limiter.size(), 1);
  } finally {
    s.close();
  }
});

test('8. limit・windowMs が正の整数でなければ、作る時点で TypeError', () => {
  assert.throws(() => rateLimit({ limit: 0 }), TypeError);
  assert.throws(() => rateLimit({ limit: 1.5 }), TypeError);
  assert.throws(() => rateLimit({ windowMs: -1 }), TypeError);
  assert.throws(() => rateLimit({ windowMs: '1000' }), TypeError);
});
