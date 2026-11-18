// 練習問題2 のテスト
// 使い方: node --test cancel-problem.test.ts
//   模範解答を試す: MODULE=../solutions/cancel-problem.ts node --test cancel-problem.test.ts
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { canCancel } from './domain/booking-rules.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './cancel-problem.ts');
const mod: typeof import('./cancel-problem.ts') = await import(pathToFileURL(file).href);
const { cancelProblem } = mod;

test('ok は null', () => {
  assert.equal(cancelProblem('ok'), null);
});

test('forbidden は 403、canceled と started は 409（文は本文のサービスと同じ）', () => {
  assert.deepEqual(cancelProblem('forbidden'), { status: 403, detail: '自分の予約だけを取り消せます' });
  assert.deepEqual(cancelProblem('canceled'), { status: 409, detail: 'この予約は、もう取り消してあります' });
  assert.deepEqual(cancelProblem('started'), { status: 409, detail: '始まった予約は取り消せません' });
});

test('canCancel とつなげる: 管理者はほかの人の予約も取り消せるが、始まったものはだめ', () => {
  const now = new Date('2026-12-10T10:30:00+09:00');
  const booking = { userId: 1, startsAt: new Date('2026-12-10T11:00:00+09:00'), canceledAt: null };
  assert.equal(cancelProblem(canCancel(booking, { id: 2, role: 'admin' }, now)), null);
  assert.equal(cancelProblem(canCancel(booking, { id: 2, role: 'member' }, now))?.status, 403);
  const started = { ...booking, startsAt: new Date('2026-12-10T10:00:00+09:00') };
  assert.equal(cancelProblem(canCancel(started, { id: 2, role: 'admin' }, now))?.status, 409);
});

test('tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
