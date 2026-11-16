// 第43章 練習問題1のテスト: npx vitest run fieldErrors.test.ts
import { expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/fieldErrors.ts で模範解答に替えられる
const mod: typeof import('./fieldErrors.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './fieldErrors.ts', import.meta.url).pathname);
const { toFieldErrors } = mod;

test('pointer の #/ を除いた名前にする', () => {
  expect(
    toFieldErrors({
      errors: [
        { pointer: '#/title', detail: 'title は 1〜100 文字です' },
        { pointer: '#/dueDate', detail: '締め切りが過ぎています' },
      ],
    }),
  ).toEqual({ title: 'title は 1〜100 文字です', dueDate: '締め切りが過ぎています' });
});

test('クエリの間違い（parameter）は、その名前にする', () => {
  expect(toFieldErrors({ errors: [{ parameter: 'limit', detail: 'limit は 1〜100 の整数' }] })).toEqual({ limit: 'limit は 1〜100 の整数' });
});

test('場所の無い間違いは、空の名前 "" にする', () => {
  expect(toFieldErrors({ errors: [{ detail: '何かがおかしい' }] })).toEqual({ '': '何かがおかしい' });
});

test('同じ名前が2つあれば、最初の文を使う。#/tags/0 は tags', () => {
  expect(
    toFieldErrors({
      errors: [
        { pointer: '#/title', detail: '1つ目' },
        { pointer: '#/title', detail: '2つ目' },
        { pointer: '#/tags/0', detail: 'タグの間違い' },
      ],
    }),
  ).toEqual({ title: '1つ目', tags: 'タグの間違い' });
});

test('errors が無ければ、空のオブジェクト', () => {
  expect(toFieldErrors({ title: 'Conflict', detail: '同じ題名があります' })).toEqual({});
});
