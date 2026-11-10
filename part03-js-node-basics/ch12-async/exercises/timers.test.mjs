// 練習問題1 用: timers.mjs のテスト
// 使い方: node --test timers.test.mjs
//   模範解答を試す: MODULE=../solutions/timers.mjs node --test timers.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './timers.mjs');
const { delay, delayFail, valueOr } = await import(pathToFileURL(modulePath).href);

test('delay は Promise を返す', () => {
  const p = delay(10, 'x');
  assert.ok(p instanceof Promise, 'Promise ではありません（return を忘れていませんか）');
  return p;
});

test('delay は value で成功する', async () => {
  assert.equal(await delay(10, 'こんにちは'), 'こんにちは');
});

test('delay は ms ミリ秒たってから成功する', async () => {
  const start = Date.now();
  await delay(100);
  const took = Date.now() - start;
  assert.ok(took >= 90, `${took}ms で終わりました。100ms 待っていません`);
});

test('delayFail は ms ミリ秒たってから、message の Error で失敗する', async () => {
  const start = Date.now();
  await assert.rejects(delayFail(100, 'だめでした'), { name: 'Error', message: 'だめでした' });
  const took = Date.now() - start;
  assert.ok(took >= 90, `${took}ms で失敗しました。100ms 待っていません`);
});

test('valueOr は、成功したらその値を返す', async () => {
  assert.equal(await valueOr(delay(10, 42), 0), 42);
});

test('valueOr は、失敗したら fallback を返す', async () => {
  assert.equal(await valueOr(delayFail(10, 'だめ'), '代わり'), '代わり');
});

test('valueOr は、失敗しても例外を外に出さない', async () => {
  await assert.doesNotReject(valueOr(delayFail(10, 'だめ'), null));
});
