// 練習問題2 用: tasks.mjs のテスト
// 使い方: node --test tasks.test.mjs
//   模範解答を試す: MODULE=../solutions/tasks.mjs node --test tasks.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './tasks.mjs');
const { undoneTitles, totalMinutes, countByTag, sortByMinutes } = await import(pathToFileURL(modulePath).href);

// 本文 7.1節と同じデータ（テストごとに新しく作る）
function makeTasks() {
  return [
    { id: 1, title: '牛乳を買う', done: false, tags: ['買い物'], minutes: 10 },
    { id: 2, title: '第11章を読む', done: true, tags: ['勉強'], minutes: 90 },
    { id: 3, title: '練習問題を解く', done: false, tags: ['勉強', 'Node.js'], minutes: 120 },
    { id: 4, title: 'パンを買う', done: true, tags: ['買い物'], minutes: 5 },
    { id: 5, title: '散歩', done: false, tags: [], minutes: 10 },
  ];
}

test('undoneTitles: 未完了のタイトルを、元の順番で返す', () => {
  assert.deepEqual(undoneTitles(makeTasks()), ['牛乳を買う', '練習問題を解く', '散歩']);
});

test('undoneTitles: 空の配列なら空の配列', () => {
  assert.deepEqual(undoneTitles([]), []);
});

test('totalMinutes: すべての minutes を足す', () => {
  assert.equal(totalMinutes(makeTasks()), 235);
});

test('totalMinutes: onlyDone が true なら、完了したものだけ', () => {
  assert.equal(totalMinutes(makeTasks(), true), 95);
});

test('totalMinutes: 空の配列なら 0', () => {
  assert.equal(totalMinutes([]), 0);
});

test('countByTag: タグごとに数える（タグが2つあるタスクは、両方に数える）', () => {
  assert.deepEqual(countByTag(makeTasks()), { 買い物: 2, 勉強: 2, 'Node.js': 1 });
});

test('countByTag: 空の配列なら空のオブジェクト', () => {
  assert.deepEqual(countByTag([]), {});
});

test('sortByMinutes: 短い順。同じ minutes なら id の小さい順', () => {
  assert.deepEqual(sortByMinutes(makeTasks()).map((t) => t.id), [4, 1, 5, 2, 3]);
});

test('sortByMinutes: 渡した配列の順番は変えない', () => {
  const tasks = makeTasks();
  sortByMinutes(tasks);
  assert.deepEqual(tasks.map((t) => t.id), [1, 2, 3, 4, 5]);
});
