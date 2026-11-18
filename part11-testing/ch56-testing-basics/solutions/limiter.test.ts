// 練習問題8 の模範解答: 偽物の時計（変数を読む関数）で「今」を進め、窓の境目を確かめる
// 確かめ方（exercises/ で）: node ../../tools/check-tests.ts ../solutions/limiter.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? '../exercises/limiter.ts');
const { createLimiter }: typeof import('../exercises/limiter.ts') = await import(pathToFileURL(file).href);

// 追加: 時計の偽物。clock.now を書き換えると「今」が変わる
function setup(limit = 2) {
  const clock = { now: 0 };
  const limiter = createLimiter({ limit, windowMs: 1000, now: () => clock.now });
  return { clock, limiter };
}

test('limit 回までは許し、remaining が 1 ずつ減る', () => {
  const { limiter } = setup();
  assert.deepEqual(limiter.hit('alice'), { allowed: true, remaining: 1, retryAfterMs: 0 });
  assert.deepEqual(limiter.hit('alice'), { allowed: true, remaining: 0, retryAfterMs: 0 });
});

test('limit を超えたら断り、次の窓までの時間を返す', () => {
  const { clock, limiter } = setup();
  clock.now = 200;
  limiter.hit('alice');
  limiter.hit('alice');
  clock.now = 700;
  assert.deepEqual(limiter.hit('alice'), { allowed: false, remaining: 0, retryAfterMs: 300 });
});

test('窓の境目ちょうど（1000ms）で数え直す', () => {
  const { clock, limiter } = setup();
  limiter.hit('alice');
  limiter.hit('alice');
  clock.now = 999;
  assert.equal(limiter.hit('alice').allowed, false);
  clock.now = 1000;
  assert.deepEqual(limiter.hit('alice'), { allowed: true, remaining: 1, retryAfterMs: 0 });
});

test('断られた後も、次の窓では limit 回できる', () => {
  const { clock, limiter } = setup();
  for (let i = 0; i < 5; i++) limiter.hit('alice'); // 3回は断られる
  clock.now = 1000;
  assert.equal(limiter.hit('alice').allowed, true);
  assert.equal(limiter.hit('alice').allowed, true);
  assert.equal(limiter.hit('alice').allowed, false);
});

test('キーごとに数える', () => {
  const { limiter } = setup(1);
  assert.equal(limiter.hit('alice').allowed, true);
  assert.equal(limiter.hit('bob').allowed, true);
  assert.equal(limiter.hit('alice').allowed, false);
});
