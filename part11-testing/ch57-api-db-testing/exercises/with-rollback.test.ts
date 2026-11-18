// 練習問題8 のテスト（PostgreSQL 5433 が要る）
// 使い方: node --test with-rollback.test.ts
//   模範解答を試す: MODULE=../solutions/with-rollback.ts node --test with-rollback.test.ts
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createPgRepo } from './pg-repo.ts';
import { createTestDb, type TestDb } from './test-db.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './with-rollback.ts');
const { withRollback }: typeof import('./with-rollback.ts') = await import(pathToFileURL(file).href);

let db: TestDb;
before(async () => {
  db = await createTestDb();
});
after(() => db?.drop());

const count = async () => (await db.pool.query<{ n: number }>('SELECT count(*)::int AS n FROM tasks')).rows[0]?.n;

test('中では書いたものが読め、終わると消えている。fn の戻り値を返す', async () => {
  const result = await withRollback(db.pool, async (client) => {
    const repo = createPgRepo(client);
    await repo.insert({ title: '牛乳を買う', dueDate: null });
    assert.equal((await repo.list()).length, 1);
    return 'できた';
  });
  assert.equal(result, 'できた');
  assert.equal(await count(), 0);
});

test('fn が例外を投げても取り消し、同じ例外を投げる', async () => {
  const boom = new Error('失敗');
  await assert.rejects(
    withRollback(db.pool, async (client) => {
      await createPgRepo(client).insert({ title: 'a', dueDate: null });
      throw boom;
    }),
    (err) => err === boom,
  );
  assert.equal(await count(), 0);
});

test('トランザクションの中で動く（外の接続からは、途中の行が見えない）', async () => {
  await withRollback(db.pool, async (client) => {
    await createPgRepo(client).insert({ title: 'a', dueDate: null });
    assert.equal(await count(), 0); // db.pool の別の接続から数える
  });
});

test('接続を必ず返す（何回使っても、借りたままにならない）', async () => {
  for (let i = 0; i < 6; i++) {
    await withRollback(db.pool, async () => {}).catch(() => {});
    await withRollback(db.pool, async () => {
      throw new Error('x');
    }).catch(() => {});
  }
  // test-db.ts のプールは max: 4。返していなければ、ここで止まる（テストは 5 秒で失敗させる）
  const n = await Promise.race([count(), new Promise((resolve) => setTimeout(() => resolve('止まった'), 5000))]);
  assert.equal(n, 0);
  assert.equal(db.pool.totalCount - db.pool.idleCount, 0, '借りたままの接続がある');
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
