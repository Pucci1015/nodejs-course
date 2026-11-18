// 練習問題1 のテスト
// 使い方: node --test db-url.test.ts
//   模範解答を試す: MODULE=../solutions/db-url.ts node --test db-url.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './db-url.ts');
const { inspectDatabaseUrl }: typeof import('./db-url.ts') = await import(pathToFileURL(file).href);

const good = 'postgres://app:dev-only-password@db.example.com:5432/taskapi?sslmode=verify-full';

test('問題の無い URL: パスワードを *** にして、problems は空', () => {
  assert.deepEqual(inspectDatabaseUrl(good), {
    redacted: 'postgres://app:***@db.example.com:5432/taskapi?sslmode=verify-full',
    problems: [],
  });
});

test('postgresql:// でもよい。sslmode=no-verify もよい', () => {
  const r = inspectDatabaseUrl('postgresql://app:dev-only-password@db.example.com/taskapi?sslmode=no-verify');
  assert.deepEqual(r.problems, []);
});

test('読めない URL は、中身を見せない', () => {
  assert.deepEqual(inspectDatabaseUrl('postgres://app:dev-only-password@ db/taskapi'), {
    redacted: '(読めません)',
    problems: ['URL として読めません'],
  });
});

test('postgres:// で始まらない', () => {
  const r = inspectDatabaseUrl('mysql://app:dev-only-password@db.example.com/taskapi?sslmode=verify-full');
  assert.deepEqual(r.problems, ['postgres:// か postgresql:// で始まっていません']);
});

test('localhost を指している・パスワードが無い・データベースの名前が無い', () => {
  assert.deepEqual(inspectDatabaseUrl('postgres://app@localhost:5433/?sslmode=verify-full'), {
    redacted: 'postgres://app@localhost:5433/?sslmode=verify-full',
    problems: [
      'このコンピュータ（localhost）を指しています',
      'パスワードがありません',
      'データベースの名前がありません',
    ],
  });
  for (const host of ['127.0.0.1', '[::1]']) {
    const r = inspectDatabaseUrl(`postgres://app:x@${host}/taskapi?sslmode=verify-full`);
    assert.deepEqual(r.problems, ['このコンピュータ（localhost）を指しています'], host);
  }
});

test('sslmode が無い・暗号化しない', () => {
  for (const q of ['', '?sslmode=disable', '?sslmode=allow', '?sslmode=prefer']) {
    const r = inspectDatabaseUrl(`postgres://app:x@db.example.com/taskapi${q}`);
    assert.deepEqual(r.problems, ['暗号化しない設定です（sslmode=verify-full にします）'], q);
  }
});

test('sslmode=require・verify-ca は、書き直すよう勧める', () => {
  for (const mode of ['require', 'verify-ca']) {
    const r = inspectDatabaseUrl(`postgres://app:x@db.example.com/taskapi?sslmode=${mode}`);
    assert.deepEqual(r.problems, [`sslmode=${mode} は pg 9 で意味が変わります（verify-full と書きます）`], mode);
  }
});

test('パスワードに記号があっても *** になる', () => {
  const r = inspectDatabaseUrl('postgres://app:p%40ss%2Fw0rd@db.example.com/taskapi?sslmode=verify-full');
  assert.equal(r.redacted, 'postgres://app:***@db.example.com/taskapi?sslmode=verify-full');
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
