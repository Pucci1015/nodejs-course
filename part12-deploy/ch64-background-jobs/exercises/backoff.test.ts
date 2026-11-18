// 練習問題1 のテスト
// 使い方: node --test backoff.test.ts
//   模範解答を試す: MODULE=../solutions/backoff.ts node --test backoff.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './backoff.ts');
const mod: typeof import('./backoff.ts') = await import(pathToFileURL(file).href);
const { retryDelay, isRetryable, PermanentError } = mod;

const half = { baseMs: 1000, maxMs: 60_000, random: () => 0.5 };

test('retryDelay: 上限 = base × 2^(attempt-1) を、random で 0 から上限の間に散らす（切り捨て）', () => {
  assert.equal(retryDelay(1, half), 500); // 1000 × 0.5
  assert.equal(retryDelay(2, half), 1000); // 2000 × 0.5
  assert.equal(retryDelay(3, half), 2000); // 4000 × 0.5
  assert.equal(retryDelay(3, { ...half, random: () => 0.123 }), 492); // 4000 × 0.123
});

test('retryDelay: 上限は maxMs を超えない', () => {
  assert.equal(retryDelay(10, { ...half, random: () => 0.999 }), 59_940);
  assert.equal(retryDelay(50, { ...half, random: () => 0.5 }), 30_000);
});

test('retryDelay: random が 0 なら 0、attempt は 1 以上の整数でなければ例外', () => {
  assert.equal(retryDelay(4, { ...half, random: () => 0 }), 0);
  for (const a of [0, -1, 1.5]) assert.throws(() => retryDelay(a, half), /attempt/, String(a));
});

test('isRetryable: PermanentError は再試行しない', () => {
  assert.equal(isRetryable(new PermanentError('宛先がありません')), false);
});

test('isRetryable: つながらない・時間切れは再試行する', () => {
  for (const code of ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN']) {
    assert.equal(isRetryable(Object.assign(new Error('x'), { code })), true, code);
  }
  assert.equal(isRetryable(new DOMException('時間切れ', 'TimeoutError')), true);
});

test('isRetryable: HTTP の状態で決める（429 と 500 番台は再試行、ほかの 400 番台はしない）', () => {
  const withStatus = (status: number) => Object.assign(new Error('x'), { status });
  assert.equal(isRetryable(withStatus(429)), true);
  assert.equal(isRetryable(withStatus(503)), true);
  assert.equal(isRetryable(withStatus(500)), true);
  assert.equal(isRetryable(withStatus(400)), false);
  assert.equal(isRetryable(withStatus(404)), false);
});

test('isRetryable: SMTP の応答の番号（4xx は一時的、5xx は恒久的）', () => {
  const smtp = (responseCode: number) => Object.assign(new Error('x'), { responseCode });
  assert.equal(isRetryable(smtp(451)), true);
  assert.equal(isRetryable(smtp(421)), true);
  assert.equal(isRetryable(smtp(550)), false);
});

test('isRetryable: 分からない失敗は、再試行する（回数の上限で止まる）', () => {
  assert.equal(isRetryable(new Error('何か')), true);
  assert.equal(isRetryable('文字列'), true);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
