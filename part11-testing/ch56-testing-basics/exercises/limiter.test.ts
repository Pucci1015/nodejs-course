// 練習問題8: createLimiter のテストを書く。「今」は偽物の時計で進める
// 使い方: node --test limiter.test.ts
//         node ../../tools/check-tests.ts limiter.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './limiter.ts');
const { createLimiter }: typeof import('./limiter.ts') = await import(pathToFileURL(file).href);

test('limit 回までは許す', () => {
  const limiter = createLimiter({ limit: 2, windowMs: 1000, now: () => 0 });
  assert.equal(limiter.hit('alice').allowed, true);
  assert.equal(limiter.hit('alice').allowed, true);
});

// ここを書く（テストを書き足す）
