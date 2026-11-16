// 練習問題6 用: job-queue.mjs のテスト（PostgreSQL が動いている必要がある）
// 使い方: node --test job-queue.test.mjs
//   模範解答を試す: MODULE=../solutions/job-queue.mjs node --test job-queue.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTestPool } from './pg-test.mjs';

const q = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './job-queue.mjs')).href);

async function setup(t, options) {
  const pool = await createTestPool(t, { seed: false, ...options });
  await pool.query(q.JOBS_SQL);
  return pool;
}

test('enqueue と claimNext: 古い順に1つずつ取れ、running になって worker が入る。無ければ null', async (t) => {
  const pool = await setup(t);
  assert.equal(await q.enqueue(pool, 'mail'), 1);
  assert.equal(await q.enqueue(pool, 'report'), 2);
  assert.deepEqual(await q.claimNext(pool, 'w1'), { id: 1, kind: 'mail' });
  assert.deepEqual(await q.claimNext(pool, 'w2'), { id: 2, kind: 'report' });
  assert.equal(await q.claimNext(pool, 'w1'), null);
  const { rows } = await pool.query('SELECT id, status, worker FROM jobs ORDER BY id');
  assert.deepEqual(rows, [
    { id: 1, status: 'running', worker: 'w1' },
    { id: 2, status: 'running', worker: 'w2' },
  ]);
});

test('finish: running なら done にして true。もう一度は false。無い id も false', async (t) => {
  const pool = await setup(t);
  await q.enqueue(pool, 'mail');
  assert.equal(await q.finish(pool, 1), false, 'waiting のものは終わらせない');
  await q.claimNext(pool, 'w1');
  assert.equal(await q.finish(pool, 1), true);
  assert.equal(await q.finish(pool, 1), false);
  assert.equal(await q.finish(pool, 99), false);
  const { rows } = await pool.query('SELECT status, finished_at FROM jobs');
  assert.equal(rows[0].status, 'done');
  assert.ok(rows[0].finished_at instanceof Date);
});

test('8 人が同時に 20 回ずつ取っても、同じ仕事を2回渡さず、20 個全部が1回ずつ取られる', async (t) => {
  const pool = await setup(t, { max: 10 });
  for (let i = 0; i < 20; i++) await q.enqueue(pool, `job-${i}`);
  const got = [];
  await Promise.all(
    Array.from({ length: 8 }, async (_, w) => {
      for (;;) {
        const job = await q.claimNext(pool, `w${w}`);
        if (!job) break;
        got.push(job.id);
      }
    }),
  );
  assert.equal(got.length, 20, `取った数が ${got.length} です（同じ仕事を2回取っていませんか）`);
  assert.deepEqual([...new Set(got)].sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1));
});
