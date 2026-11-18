// 練習問題7 のテスト
// 使い方: node --test authorize.test.ts
//   模範解答を試す: MODULE=../solutions/authorize.ts node --test authorize.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './authorize.ts');
const { can, statusFor }: typeof import('./authorize.ts') = await import(pathToFileURL(file).href);
type Task = import('./authorize.ts').Task;

const alice = { id: 1, role: 'member' } as const;
const bob = { id: 2, role: 'member' } as const;
const carol = { id: 3, role: 'member' } as const;
const admin = { id: 9, role: 'admin' } as const;
const task: Task = { id: 10, ownerId: 1, sharedWith: [2], locked: false };
const locked: Task = { ...task, locked: true };

const row = (user: typeof alice | typeof bob | typeof carol | typeof admin, t: Task) =>
  (['read', 'update', 'delete', 'share'] as const).map((a) => can(user, a, t));

test('持ち主は全部できる', () => {
  assert.deepEqual(row(alice, task), [true, true, true, true]);
});

test('共有された人は、読む・直すだけ', () => {
  assert.deepEqual(row(bob, task), [true, true, false, false]);
});

test('関係の無い人は、何もできない', () => {
  assert.deepEqual(row(carol, task), [false, false, false, false]);
});

test('管理者は、読むだけ', () => {
  assert.deepEqual(row(admin, task), [true, false, false, false]);
});

test('締められたタスクは、持ち主も直せない（消す・共有はできる）', () => {
  assert.deepEqual(row(alice, locked), [true, false, true, true]);
  assert.deepEqual(row(bob, locked), [true, false, false, false]);
});

test('statusFor: 無い・見えないなら 404、見えるが操作できないなら 403、できるなら 200', () => {
  assert.equal(statusFor(alice, 'delete', undefined), 404);
  assert.equal(statusFor(carol, 'read', task), 404);
  assert.equal(statusFor(carol, 'delete', task), 404);
  assert.equal(statusFor(bob, 'delete', task), 403);
  assert.equal(statusFor(admin, 'update', task), 403);
  assert.equal(statusFor(bob, 'update', task), 200);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
