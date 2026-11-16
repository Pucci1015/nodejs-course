// 練習問題2 のテスト
// 使い方: node --test events.test.ts
//   模範解答を試す: MODULE=../solutions/events.ts node --test events.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './events.ts');
const m = await import(pathToFileURL(file).href);
/** コメントを除いたソース（ルールを確かめるため） */
const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

const tasks = [
  { id: 1, title: '牛乳を買う', done: false },
  { id: 2, title: '本を返す', done: false },
];

test('eventText: イベントごとの文', () => {
  assert.equal(m.eventText({ type: 'created', task: { id: 3, title: '掃除', done: false } }), '#3 を作りました: 掃除');
  assert.equal(m.eventText({ type: 'renamed', id: 1, title: '豆乳を買う' }), '#1 の題名を「豆乳を買う」にしました');
  assert.equal(m.eventText({ type: 'completed', id: 2 }), '#2 を完了にしました');
  assert.equal(m.eventText({ type: 'deleted', id: 2 }), '#2 を消しました');
});

test('eventText: 知らない type が実行時に来たら、assertNever が投げる', () => {
  assert.throws(() => m.eventText({ type: 'archived', id: 1 }), /知らないイベントです/);
});

test('applyEvent: 新しい配列を返す（元の配列とタスクは変えない）', () => {
  const snapshot = structuredClone(tasks);
  assert.deepEqual(m.applyEvent(tasks, { type: 'created', task: { id: 3, title: '掃除', done: false } }), [...tasks, { id: 3, title: '掃除', done: false }]);
  assert.deepEqual(m.applyEvent(tasks, { type: 'renamed', id: 1, title: '豆乳を買う' }), [{ id: 1, title: '豆乳を買う', done: false }, tasks[1]]);
  assert.deepEqual(m.applyEvent(tasks, { type: 'completed', id: 2 }), [tasks[0], { id: 2, title: '本を返す', done: true }]);
  assert.deepEqual(m.applyEvent(tasks, { type: 'deleted', id: 1 }), [tasks[1]]);
  assert.deepEqual(m.applyEvent(tasks, { type: 'completed', id: 9 }), tasks, '無い id なら、そのまま');
  assert.deepEqual(tasks, snapshot, '元の配列とタスクは変わらない');
  assert.throws(() => m.applyEvent(tasks, { type: 'archived', id: 1 }), /知らないイベントです/);
});

test('型: tsc のエラーが無い（events.check.ts の確かめを含む）', () => {
  assert.deepEqual(typeErrors([file, checkFileOf(file)]), []);
});

test('ルール: switch と assertNever を使い、as と any を使っていない', () => {
  assert.match(code, /switch\s*\(\s*e\.type\s*\)/g);
  assert.ok((code.match(/assertNever\(e\)/g) ?? []).length >= 2, '2つの関数の default で assertNever(e) を呼ぶ');
  assert.doesNotMatch(code, /\bas\s+(?!const\b)[A-Za-z]/);
  assert.doesNotMatch(code, /\bany\b/);
});
