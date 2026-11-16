// 練習問題6 のテスト
// 使い方: node --test status.test.ts
//   模範解答を試す: MODULE=../solutions/status.ts node --test status.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './status.ts');
const m = await import(pathToFileURL(file).href);

test('label: 日本語の名前', () => {
  assert.equal(m.label('todo'), '未着手');
  assert.equal(m.label('doing'), '作業中');
  assert.equal(m.label('done'), '完了');
});

test('next: todo → doing → done。done の次は done のまま', () => {
  assert.equal(m.next('todo'), 'doing');
  assert.equal(m.next('doing'), 'done');
  assert.equal(m.next('done'), 'done');
});

test('parseStatus: 前後の空白を除き、小文字にしてから読む。読めなければ null', () => {
  assert.equal(m.parseStatus('todo'), 'todo');
  assert.equal(m.parseStatus('  DOING '), 'doing');
  assert.equal(m.parseStatus('Done'), 'done');
  assert.equal(m.parseStatus('waiting'), null);
  assert.equal(m.parseStatus(''), null);
});

test('countByStatus: 状態ごとの数。無い状態は 0', () => {
  const tasks = [{ status: 'todo' }, { status: 'done' }, { status: 'todo' }];
  assert.deepEqual(m.countByStatus(tasks), { todo: 2, doing: 0, done: 1 });
  assert.deepEqual(m.countByStatus([]), { todo: 0, doing: 0, done: 0 });
});

test('型: tsc のエラーが無い（status.check.ts の確かめを含む）', () => {
  assert.deepEqual(typeErrors([file, checkFileOf(file)]), []);
});
