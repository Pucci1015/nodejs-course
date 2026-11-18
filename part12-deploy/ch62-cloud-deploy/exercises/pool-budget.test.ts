// 練習問題3 のテスト
// 使い方: node --test pool-budget.test.ts
//   模範解答を試す: MODULE=../solutions/pool-budget.ts node --test pool-budget.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './pool-budget.ts');
const { poolMax, maxInstances }: typeof import('./pool-budget.ts') = await import(pathToFileURL(file).href);

const base = { maxConnections: 100, reserved: 3, others: 5, processesPerInstance: 1, overlapDuringDeploy: false };

test('poolMax: (100 - 3 - 5) / 2 = 46', () => {
  assert.equal(poolMax({ ...base, instances: 2 }), 46);
});

test('poolMax: 割り切れなければ切り捨て', () => {
  assert.equal(poolMax({ ...base, instances: 3 }), 30); // 92 / 3 = 30.66…
  assert.equal(poolMax({ ...base, instances: 2, processesPerInstance: 4 }), 11); // 92 / 8 = 11.5
});

test('poolMax: デプロイの間に古い版も動くなら、インスタンスが2倍あるとして数える', () => {
  assert.equal(poolMax({ ...base, instances: 2, overlapDuringDeploy: true }), 23);
});

test('poolMax: 1 に満たないなら例外（台数を減らすか、データベースを大きくする）', () => {
  assert.throws(() => poolMax({ ...base, maxConnections: 25, reserved: 3, others: 5, instances: 20 }), /足りません/);
  assert.throws(() => poolMax({ ...base, maxConnections: 5, instances: 1 }), /足りません/);
});

test('maxInstances: Pool を 10 にしたら、9 台まで', () => {
  assert.equal(maxInstances(base, 10), 9); // 92 / 10 = 9.2
});

test('maxInstances: プロセスの数とデプロイの重なりも数える', () => {
  assert.equal(maxInstances({ ...base, processesPerInstance: 2 }, 10), 4); // 92 / 20
  assert.equal(maxInstances({ ...base, overlapDuringDeploy: true }, 10), 4); // 92 / 20
});

test('maxInstances: 1 台も置けないなら 0', () => {
  assert.equal(maxInstances({ ...base, maxConnections: 20 }, 25), 0);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
