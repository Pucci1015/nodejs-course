// 練習問題2 用: step-counter.mjs のテスト
// 使い方: node --test step-counter.test.mjs
//   模範解答を試す: MODULE=../solutions/step-counter.mjs node --test step-counter.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './step-counter.mjs');
const { StepCounter } = await import(pathToFileURL(modulePath).href);

test('EventEmitter を継承していて、最初の value は 0', () => {
  const c = new StepCounter(3);
  assert.ok(c instanceof EventEmitter);
  assert.equal(c.value, 0);
});

test('increment() は 1 増やし、増やした後の値を返す', () => {
  const c = new StepCounter(10);
  assert.equal(c.increment(), 1);
  assert.equal(c.increment(), 2);
  assert.equal(c.value, 2);
});

test('increment() のたびに change を、新しい値を付けて出す', () => {
  const c = new StepCounter(10);
  const seen = [];
  c.on('change', (v) => seen.push(v));
  c.increment();
  c.increment();
  assert.deepEqual(seen, [1, 2]);
});

test('change は increment() の中で（同期で）出る', () => {
  const c = new StepCounter(10);
  let seen = null;
  c.on('change', (v) => {
    seen = v;
  });
  c.increment();
  assert.equal(seen, 1, 'increment() から戻った時点で、リスナーが呼ばれていません');
});

test('value が limit になったときに、limit を1回だけ出す', () => {
  const c = new StepCounter(3);
  const seen = [];
  c.on('limit', (v) => seen.push(v));
  for (let i = 0; i < 5; i++) c.increment();
  assert.deepEqual(seen, [3]);
});

test('reset() で 0 に戻り、reset を戻す前の値を付けて出す', async () => {
  const c = new StepCounter(3);
  c.increment();
  c.increment();
  const waiting = once(c, 'reset');
  c.reset();
  assert.deepEqual(await waiting, [2]);
  assert.equal(c.value, 0);
});

test('reset() の後は、もう一度 limit に届いたら limit を出す', () => {
  const c = new StepCounter(2);
  let count = 0;
  c.on('limit', () => count++);
  c.increment();
  c.increment();
  c.reset();
  c.increment();
  c.increment();
  assert.equal(count, 2);
});
