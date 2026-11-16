// 第45章 練習問題1のテスト: npx vitest run classNames.test.ts
import { expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/classNames.ts で模範解答に替えられる
const mod: typeof import('./classNames.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './classNames.ts', import.meta.url).pathname);
const { classNames } = mod;

test('文字をつなぐ', () => {
  expect(classNames('card', 'done')).toBe('card done');
});

test('false・null・undefined・空の文字は飛ばす', () => {
  const done = false;
  expect(classNames('card', done && 'done', null, undefined, '')).toBe('card');
});

test('オブジェクトは、値が true の名前だけ', () => {
  expect(classNames('card', { done: true, urgent: false, selected: null })).toBe('card done');
});

test('空白で区切られた文字は分け、余分な空白は入れない', () => {
  expect(classNames('  a  b ', 'c')).toBe('a b c');
});

test('同じ名前は1つにする', () => {
  expect(classNames('a b', 'b', { a: true, c: true })).toBe('a b c');
});

test('何も無ければ空の文字', () => {
  expect(classNames()).toBe('');
  expect(classNames(false, { x: false })).toBe('');
});
