// 練習問題7 のテスト
// 使い方: cp stats.mjs stats.ts で作ってから、node --test stats.test.ts
//   模範解答を試す: MODULE=../solutions/stats.ts node --test stats.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './stats.ts');
if (!existsSync(file)) throw new Error('stats.ts がありません。先に cp stats.mjs stats.ts でコピーしてください');
const m = await import(pathToFileURL(file).href);

test('動き: JavaScript の版（stats.mjs）と同じ結果', () => {
  assert.equal(m.sum([1, 2, 3]), 6);
  assert.equal(m.mean([1, 2, 3, 4]), 2.5);
  assert.equal(m.mean([]), null);
  assert.equal(m.median([5, 1, 3]), 3);
  assert.equal(m.median([4, 1, 3, 2]), 2.5);
  assert.equal(m.median([]), null);
  assert.deepEqual(m.summarize([3, 1, 2]), { count: 3, min: 1, max: 3, mean: 2 });
  assert.equal(m.summarize([]), null);
  assert.equal(m.formatSummary(m.summarize([70, 85, 90])), '3件 最小 70 最大 90 平均 81.7');
  assert.equal(m.formatSummary(null), 'データがありません');
});

test('型: tsc のエラーが無い（stats.check.ts の確かめを含む）', () => {
  assert.deepEqual(typeErrors([file, checkFileOf(file)]), []);
});

test('ルール: any・as・! を使っていない', () => {
  const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\bany\b/, 'any を使わない');
  assert.doesNotMatch(code, /\bas\s+(?!const\b)[A-Za-z]/, 'as を使わない');
  assert.doesNotMatch(code, /[\w\])]!(?!=)/, '! で言い切らない');
});
