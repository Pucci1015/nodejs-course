// 練習問題5 のテスト（第6部の compose の PostgreSQL を動かしておく）
// 使い方: node --test pg-jobs.test.ts
//   模範解答を試す: MODULE=../solutions/pg-jobs.ts node --test pg-jobs.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { withTestSchema } from './pg-test.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './pg-jobs.ts');
const { createPgJobs }: typeof import('./pg-jobs.ts') = await import(pathToFileURL(file).href);

test('入れて、取って、終える。終えたものは、もう取れない', () =>
  withTestSchema(async (pool, schema) => {
    const jobs = createPgJobs(pool, schema);
    await jobs.setup();
    await jobs.setup(); // 2 回呼んでも失敗しない
    const id = await jobs.enqueue('send-mail', { to: 'alice@example.com' });
    const job = await jobs.claimNext(30);
    assert.deepEqual(job, { id, kind: 'send-mail', payload: { to: 'alice@example.com' }, attempts: 1 });
    assert.equal(await jobs.claimNext(30), undefined, '処理中のものは取れない');
    await jobs.complete(id);
    assert.equal(await jobs.claimNext(30), undefined);
  }));

test('失敗したら、delayMs が過ぎるまで取れず、過ぎたら attempts を増やして取れる', () =>
  withTestSchema(async (pool, schema) => {
    const jobs = createPgJobs(pool, schema);
    await jobs.setup();
    await jobs.enqueue('send-mail', { n: 1 });
    const first = await jobs.claimNext(30);
    assert.ok(first);
    assert.equal(await jobs.fail(first, 'つながりません', 300), 'retry');
    assert.equal(await jobs.claimNext(30), undefined, 'まだ待つ時間');
    await new Promise((r) => setTimeout(r, 400));
    const second = await jobs.claimNext(30);
    assert.equal(second?.id, first.id);
    assert.equal(second?.attempts, 2);
  }));

test('maxAttempts 回失敗したら dead。もう取れず、listDead に出る', () =>
  withTestSchema(async (pool, schema) => {
    const jobs = createPgJobs(pool, schema);
    await jobs.setup();
    const id = await jobs.enqueue('send-mail', { n: 1 }, { maxAttempts: 2 });
    const a = await jobs.claimNext(30);
    assert.ok(a);
    assert.equal(await jobs.fail(a, '1 回目', 0), 'retry');
    const b = await jobs.claimNext(30);
    assert.ok(b);
    assert.equal(await jobs.fail(b, '2 回目', 0), 'dead');
    assert.equal(await jobs.claimNext(30), undefined);
    assert.deepEqual(await jobs.listDead(), [{ id, kind: 'send-mail', attempts: 2, lastError: '2 回目' }]);
  }));

test('maxAttempts の既定は 5', () =>
  withTestSchema(async (pool, schema) => {
    const jobs = createPgJobs(pool, schema);
    await jobs.setup();
    await jobs.enqueue('x', {});
    const results: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      const j = await jobs.claimNext(30);
      assert.ok(j, `${i + 1} 回目が取れない`);
      results.push(await jobs.fail(j, 'だめ', 0));
    }
    assert.deepEqual(results, ['retry', 'retry', 'retry', 'retry', 'dead']);
  }));

test('ロックの期限が切れた仕事（ワーカーが落ちた）は、また取れる', () =>
  withTestSchema(async (pool, schema) => {
    const jobs = createPgJobs(pool, schema);
    await jobs.setup();
    await jobs.enqueue('x', {});
    const a = await jobs.claimNext(0.2);
    assert.ok(a);
    await new Promise((r) => setTimeout(r, 300));
    const b = await jobs.claimNext(30);
    assert.equal(b?.id, a.id);
    assert.equal(b?.attempts, 2);
  }));

test('2 つの接続から同時に取っても、同じ仕事を2回取らない', () =>
  withTestSchema(async (pool, schema) => {
    const jobs = createPgJobs(pool, schema);
    await jobs.setup();
    for (let i = 0; i < 10; i += 1) await jobs.enqueue('x', { i });
    const taken: string[] = [];
    for (;;) {
      const got = await Promise.all([jobs.claimNext(30), jobs.claimNext(30)]);
      if (got.every((j) => j === undefined)) break;
      for (const j of got) if (j) taken.push(j.id);
    }
    assert.equal(taken.length, 10);
    assert.equal(new Set(taken).size, 10);
  }));

test('schema の名前が正しくなければ例外（SQL に埋め込むので）', () => {
  assert.throws(() => createPgJobs({} as never, 'x; DROP'), /schema/);
  assert.throws(() => createPgJobs({} as never, 'Upper'), /schema/);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
