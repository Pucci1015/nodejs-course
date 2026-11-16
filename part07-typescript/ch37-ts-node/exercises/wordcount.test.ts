// 練習問題1 のテスト
// 使い方: cp wordcount.mjs wordcount.ts で作ってから、node --test wordcount.test.ts
//   模範解答を試す: MODULE=../solutions/wordcount.ts node --test wordcount.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './wordcount.ts');
if (!existsSync(file)) throw new Error('wordcount.ts がありません。先に cp wordcount.mjs wordcount.ts でコピーしてください');
const m = await import(pathToFileURL(file).href);

test('countText と topWords', () => {
  assert.deepEqual(m.countText('a b\nc\n'), { lines: 2, words: 3, chars: 6 });
  assert.deepEqual(m.countText(''), { lines: 0, words: 0, chars: 0 });
  assert.deepEqual(m.topWords('b a b c a b', 2), [{ word: 'b', count: 3 }, { word: 'a', count: 2 }]);
});

test('CLI: node wordcount.ts sample.txt 2', () => {
  const r = spawnSync(process.execPath, [file, 'sample.txt', '2'], { cwd: import.meta.dirname, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, '3行 17語 58文字\n4 the\n2 on\n');
});

test('CLI: 引数が無い・上位の数が変なら、終了コード 1', () => {
  const r1 = spawnSync(process.execPath, [file], { cwd: import.meta.dirname, encoding: 'utf8' });
  assert.equal(r1.status, 1);
  assert.match(r1.stderr, /使い方/);
  const r2 = spawnSync(process.execPath, [file, 'sample.txt', 'abc'], { cwd: import.meta.dirname, encoding: 'utf8' });
  assert.equal(r2.status, 1);
});

test('型: tsc のエラーが無い（wordcount.check.ts の確かめを含む）', () => {
  assert.deepEqual(typeErrors([file, checkFileOf(file)]), []);
});

test('ルール: any と as を使っていない', () => {
  const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\bany\b/);
  assert.doesNotMatch(code, /\bas\s+(?!const\b)[A-Za-z]/);
});
