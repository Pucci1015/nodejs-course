// 練習問題5 のテスト
// 使い方: node --test find.test.ts
//   模範解答を試す: MODULE=../solutions/find.ts node --test find.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './find.ts');
const m = await import(pathToFileURL(file).href);
const tasks = [
  { id: 1, title: '牛乳を買う', done: false, dueDate: '2026-11-20' },
  { id: 2, title: '本を返す', done: true, dueDate: '2026-11-12' },
  { id: 3, title: '掃除', done: false },
  { id: 4, title: '手紙を出す', done: false, dueDate: '2026-11-15' },
];

test('findTask: id で探す。無ければ undefined', () => {
  assert.equal(m.findTask(tasks, 3).title, '掃除');
  assert.equal(m.findTask(tasks, 9), undefined);
});

test('titleOf: 題名。無ければ （なし）', () => {
  assert.equal(m.titleOf(tasks, 1), '牛乳を買う');
  assert.equal(m.titleOf(tasks, 9), '（なし）');
});

test('lastTitle: 最後のタスクの題名。空なら undefined', () => {
  assert.equal(m.lastTitle(tasks), '手紙を出す');
  assert.equal(m.lastTitle([]), undefined);
});

test('nextDue: 終わっていないタスクの中で、いちばん早い締め切り。無ければ null', () => {
  assert.equal(m.nextDue(tasks), '2026-11-15');
  assert.equal(m.nextDue([tasks[1], tasks[2]]), null, '終わったものと、締め切りの無いものは数えない');
  assert.equal(m.nextDue([]), null);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});

test('ルール: ! と as を使っていない', () => {
  const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\bas\s+(?!const\b)[A-Za-z]/, 'as を使わない');
  assert.doesNotMatch(code, /[\w\])]!(?!=)/, '! で言い切らない');
});
