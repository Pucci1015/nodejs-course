// 第44章 練習問題1のテスト: npx vitest run listParams.test.ts
import { expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/listParams.ts で模範解答に替えられる
const mod: typeof import('./listParams.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './listParams.ts', import.meta.url).pathname);
const { parseListParams, toListParams } = mod;
const parse = (s: string) => parseListParams(new URLSearchParams(s));

test('何も無ければ、決まりの値', () => {
  expect(parse('')).toEqual({ statuses: [], page: 1, q: '' });
});

test('status はカンマで区切り、知らない値は捨て、todo・doing・done の順で同じものは1つ', () => {
  expect(parse('status=done,todo,xx,done').statuses).toEqual(['todo', 'done']);
});

test('page は 1 以上の整数だけ。ほかは 1', () => {
  expect(parse('page=3').page).toBe(3);
  for (const p of ['0', '-1', '2.5', 'abc', '', '03']) expect(parse(`page=${p}`).page).toBe(1);
});

test('q は前後の空白を除く', () => {
  expect(parse('q=%20牛乳%20').q).toBe('牛乳');
});

test('toListParams: 決まりの値は書かない', () => {
  expect(toListParams({ statuses: [], page: 1, q: '  ' }).toString()).toBe('');
  expect(toListParams({ statuses: ['done', 'todo'], page: 2, q: '本' }).toString()).toBe('status=todo%2Cdone&page=2&q=%E6%9C%AC');
});

test('行って戻ると同じ', () => {
  const p = { statuses: ['doing' as const], page: 5, q: 'レポート' };
  expect(parseListParams(toListParams(p))).toEqual(p);
});
