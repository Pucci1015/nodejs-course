// 練習問題1: toSlug のテストを書く
// 使い方: node --test slug.test.ts                     … 自分のテストを動かす
//         node ../../tools/check-tests.ts slug.test.ts  … わざと壊した実装（mutants/）を見つけられるか確かめる
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './slug.ts');
const { toSlug }: typeof import('./slug.ts') = await import(pathToFileURL(file).href);

test('空白は - になる', () => {
  assert.equal(toSlug('buy milk'), 'buy-milk');
});

// ここを書く（テストを書き足す）
