// 練習問題7 のテスト
// 使い方: node --test link-account.test.ts
//   模範解答を試す: MODULE=../solutions/link-account.ts node --test link-account.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './link-account.ts');
const { createAccounts }: typeof import('./link-account.ts') = await import(pathToFileURL(file).href);

// パスワードで登録済みの alice（確認済み）と、確認がまだの bob
const initial = [
  { id: 1, email: 'alice@example.com', emailVerified: true },
  { id: 2, email: 'bob@example.com', emailVerified: false },
];

test('新しい人: created。2回目は existing で同じ id', () => {
  const a = createAccounts(initial);
  const first = a.signIn({ provider: 'mini-idp', sub: 'u-3001', email: 'carol@example.com', emailVerified: true });
  assert.deepEqual(first, { kind: 'created', userId: 3 });
  assert.deepEqual(a.getUser(3), { id: 3, email: 'carol@example.com', emailVerified: true });
  assert.deepEqual(a.signIn({ provider: 'mini-idp', sub: 'u-3001', email: 'carol@example.com', emailVerified: true }), {
    kind: 'existing',
    userId: 3,
  });
});

test('2回目は、メールアドレスが変わっていても sub で同じ人', () => {
  const a = createAccounts(initial);
  a.signIn({ provider: 'mini-idp', sub: 'u-3001', email: 'carol@example.com', emailVerified: true });
  assert.deepEqual(a.signIn({ provider: 'mini-idp', sub: 'u-3001', email: 'carol@example.net', emailVerified: true }), {
    kind: 'existing',
    userId: 3,
  });
});

test('同じアドレスの確認済みのユーザーがいて、IdP でも確認済みなら linked（大文字小文字・空白はそろえる）', () => {
  const a = createAccounts(initial);
  assert.deepEqual(a.signIn({ provider: 'mini-idp', sub: 'u-1001', email: ' Alice@Example.com', emailVerified: true }), {
    kind: 'linked',
    userId: 1,
  });
  assert.deepEqual(a.signIn({ provider: 'mini-idp', sub: 'u-1001', email: 'alice@example.com', emailVerified: true }), {
    kind: 'existing',
    userId: 1,
  });
});

test('IdP のアドレスが確認されていない、または、こちらのユーザーが確認されていないなら conflict', () => {
  const a = createAccounts(initial);
  assert.deepEqual(a.signIn({ provider: 'mini-idp', sub: 'x-1', email: 'alice@example.com', emailVerified: false }), { kind: 'conflict' });
  assert.deepEqual(a.signIn({ provider: 'mini-idp', sub: 'x-2', email: 'bob@example.com', emailVerified: true }), { kind: 'conflict' });
});

test('sub は IdP ごと: 別の provider の同じ sub は、別の人', () => {
  const a = createAccounts([]);
  assert.deepEqual(a.signIn({ provider: 'mini-idp', sub: '42', email: 'carol@example.com', emailVerified: true }), {
    kind: 'created',
    userId: 1,
  });
  assert.deepEqual(a.signIn({ provider: 'github', sub: '42', email: 'dave@example.com', emailVerified: true }), {
    kind: 'created',
    userId: 2,
  });
});

test('アドレスが無い IdP: 新しいユーザー（email は空、emailVerified は false）', () => {
  const a = createAccounts(initial);
  assert.deepEqual(a.signIn({ provider: 'github', sub: '7', email: undefined, emailVerified: true }), { kind: 'created', userId: 3 });
  assert.deepEqual(a.getUser(3), { id: 3, email: '', emailVerified: false });
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
