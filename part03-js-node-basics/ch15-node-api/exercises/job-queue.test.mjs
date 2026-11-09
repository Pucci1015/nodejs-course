// 練習問題5 用: job-queue.mjs の JobQueue のテスト
// 使い方: node --test job-queue.test.mjs
//   模範解答を試す: MODULE=../solutions/job-queue.mjs node --test job-queue.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './job-queue.mjs');
const { JobQueue } = await import(pathToFileURL(modulePath).href);

const job = (ms, value) => () => sleep(ms, value);

test('EventEmitter を継承している', () => {
  assert.ok(new JobQueue() instanceof EventEmitter);
});

test('add は、仕事の結果で fulfilled になる Promise を返す', async () => {
  const q = new JobQueue();
  assert.deepEqual(await Promise.all([q.add(job(10, 'a')), q.add(job(5, 'b'))]), ['a', 'b']);
});

test('同時に動くのは concurrency 個まで。size と running で数が分かる', async () => {
  const q = new JobQueue({ concurrency: 2 });
  let max = 0;
  q.on('start', () => (max = Math.max(max, q.running)));
  const all = Promise.all([1, 2, 3, 4, 5].map((n) => q.add(job(10, n))));
  await sleep(0);
  assert.equal(q.running, 2);
  assert.equal(q.size, 3);
  await all;
  assert.equal(max, 2);
  assert.equal(q.size + q.running, 0);
});

test('start・done のイベントで、進み具合が分かる', async () => {
  const q = new JobQueue({ concurrency: 1 });
  const events = [];
  q.on('start', ({ id, name }) => events.push(`start ${id} ${name}`));
  q.on('done', ({ id, name, result, ms }) => {
    assert.equal(typeof ms, 'number');
    events.push(`done ${id} ${name} ${result}`);
  });
  await Promise.all([q.add(job(5, 'A'), { name: '1つ目' }), q.add(job(5, 'B'), { name: '2つ目' })]);
  assert.deepEqual(events, ['start 1 1つ目', 'done 1 1つ目 A', 'start 2 2つ目', 'done 2 2つ目 B']);
});

test('add した直後に on を付けても、start を聞き逃さない', async () => {
  const q = new JobQueue();
  const p = q.add(job(1, 'x'), { name: 'すぐ' });
  const started = [];
  q.on('start', ({ name }) => started.push(name));
  await p;
  assert.deepEqual(started, ['すぐ']);
});

test('失敗した仕事は failed を emit し、Promise は rejected。ほかの仕事は続く', async () => {
  const q = new JobQueue({ concurrency: 1 });
  const failed = [];
  q.on('failed', ({ name, error }) => failed.push(`${name}: ${error.message}`));
  const bad = q.add(
    () => {
      throw new Error('同期で失敗');
    },
    { name: 'だめ' },
  );
  const good = q.add(job(5, 'ok'));
  await assert.rejects(bad, { message: '同期で失敗' });
  assert.equal(await good, 'ok');
  assert.deepEqual(failed, ['だめ: 同期で失敗']);
});

test('error のリスナーが無くても、仕事の失敗で列は止まらない（error は emit しない）', async () => {
  const q = new JobQueue();
  await assert.rejects(q.add(() => Promise.reject(new Error('x'))));
  assert.equal(await q.add(job(1, 'まだ動く')), 'まだ動く');
});

test('全部終わると idle を emit する。onIdle() で待てる（何も無ければすぐ終わる）', async () => {
  const q = new JobQueue({ concurrency: 3 });
  await q.onIdle();
  let idles = 0;
  q.on('idle', () => idles++);
  for (let i = 0; i < 5; i++) q.add(job(5 + i, i));
  await q.onIdle();
  assert.equal(q.size + q.running, 0);
  assert.equal(idles, 1);
});

test('pause している間は新しい仕事を始めず、resume で再開する', async () => {
  const q = new JobQueue({ concurrency: 1 });
  q.pause();
  const p = q.add(job(1, 'later'));
  await sleep(20);
  assert.equal(q.running, 0);
  assert.equal(q.size, 1);
  q.resume();
  assert.equal(await p, 'later');
});

test('concurrency が1以上の整数でなければ RangeError。仕事が関数でなければ TypeError', () => {
  assert.throws(() => new JobQueue({ concurrency: 0 }), RangeError);
  assert.throws(() => new JobQueue().add('not a function'), TypeError);
});
