// 練習問題5 用: slug.mjs の isValidSlug のテスト
// 使い方: node --test slug.test.mjs
//   模範解答を試す: MODULE=../solutions/slug.mjs node --test slug.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './slug.mjs');
const moduleUrl = pathToFileURL(modulePath).href;
const { isValidSlug } = await import(moduleUrl);

test('正しいスラッグを受け付ける', () => {
  for (const s of ['a', '0', 'hello', 'hello-world', 'hello-world-2026', 'a-b-c-d', 'x'.repeat(100), '2026']) {
    assert.equal(isValidSlug(s), true, JSON.stringify(s));
  }
});

test('正しくないスラッグを断る', () => {
  for (const s of ['', '-', 'a-', '-a', 'a--b', 'Hello', 'hello_world', 'hello world', 'こんにちは', 'a/b', 'x'.repeat(101), 'a\n']) {
    assert.equal(isValidSlug(s), false, JSON.stringify(s));
  }
});

test('文字列でないものは false', () => {
  for (const v of [undefined, null, 123, ['a'], { toString: () => 'a' }]) {
    assert.equal(isValidSlug(v), false, String(v));
  }
});

/**
 * Worker の中で isValidSlug(input) を実行し、かかった時間を返す。
 * メインのスレッドで実行すると、テスト自体が止まってしまうため。timeoutMs を超えたら Worker を止める。
 */
function timeInWorker(input, timeoutMs) {
  const code = `
    const { parentPort, workerData } = require('node:worker_threads');
    import(workerData.moduleUrl).then(({ isValidSlug }) => {
      const start = performance.now();
      isValidSlug(workerData.input);
      parentPort.postMessage(performance.now() - start);
    });
  `;
  return new Promise((resolve, reject) => {
    const worker = new Worker(code, { eval: true, workerData: { moduleUrl, input } });
    const timer = setTimeout(() => {
      worker.terminate();
      resolve(Infinity);
    }, timeoutMs);
    worker.once('message', (ms) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(ms);
    });
    worker.once('error', reject);
  });
}

test('意地の悪い入力でも、すぐに終わる', async () => {
  for (const input of ['a'.repeat(40) + '!', 'a-'.repeat(49) + '!', '1'.repeat(99) + '-', 'ab'.repeat(30) + '--']) {
    const ms = await timeInWorker(input, 1000);
    assert.ok(ms < 50, `${JSON.stringify(input.slice(0, 12))}…（長さ ${input.length}）に ${ms === Infinity ? '1秒以上' : `${ms.toFixed(0)}ms`} かかった`);
  }
});
