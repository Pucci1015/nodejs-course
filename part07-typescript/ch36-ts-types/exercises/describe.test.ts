// 練習問題1 のテスト
// 使い方: node --test describe.test.ts
//   模範解答を試す: MODULE=../solutions/describe.ts node --test describe.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './describe.ts');
const m = await import(pathToFileURL(file).href);
/** コメントを除いたソース（ルールを確かめるため） */
const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

test('null と undefined', () => {
  assert.equal(m.describe(null), '（なし）');
  assert.equal(m.describe(undefined), '（なし）');
});

test('文字列・数・真偽値', () => {
  assert.equal(m.describe('ねこ'), '文字列「ねこ」（2文字）');
  assert.equal(m.describe(''), '文字列「」（0文字）');
  assert.equal(m.describe(42), '整数 42');
  assert.equal(m.describe(0.5), '小数 0.5');
  assert.equal(m.describe(true), 'はい');
  assert.equal(m.describe(false), 'いいえ', 'false も（なし）にしない');
});

test('配列と日付', () => {
  assert.equal(m.describe(['家', '急ぎ']), '2個: 家, 急ぎ');
  assert.equal(m.describe([]), '0個');
  assert.equal(m.describe(new Date('2026-11-11T15:00:00Z')), '日付 2026-11-11');
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});

test('ルール: as と any を使っていない', () => {
  assert.doesNotMatch(code, /\bas\s+(?!const\b)[A-Za-z]/);
  assert.doesNotMatch(code, /\bany\b/);
});
