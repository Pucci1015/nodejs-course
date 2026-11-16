// 9節: 型を確かめる書き方（練習問題の *.check.ts で使う）
import type { Equal, Expect } from './type-assert.ts';

function add(a: number, b: number): number {
  return a + b;
}

// 「この行はエラーになるはず」。エラーにならなければ、tsc がこの行をエラーにする
// @ts-expect-error 文字列は渡せない
add('1', 2);

// 「2つの型が同じはず」。違えば、tsc がこの行をエラーにする
type Checks = [
  Expect<Equal<ReturnType<typeof add>, number>>,
  Expect<Equal<Parameters<typeof add>, [a: number, b: number]>>,
];
