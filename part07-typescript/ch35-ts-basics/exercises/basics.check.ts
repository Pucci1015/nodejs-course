// 練習問題1 の型の確かめ（書き換えない）。basics.test.ts が、このファイルを tsc で確かめる
import type { Equal, Expect } from './type-assert.ts';
import { add, average, formatPrice, line } from './basics.ts';

export type Checks = [
  Expect<Equal<Parameters<typeof add>, [a: number, b: number]>>,
  Expect<Equal<ReturnType<typeof add>, number>>,
  Expect<Equal<Parameters<typeof average>, [nums: number[]]>>,
  Expect<Equal<ReturnType<typeof average>, number>>,
  Expect<Equal<Parameters<typeof formatPrice>, [yen: number, withTax?: boolean]>>,
  Expect<Equal<ReturnType<typeof formatPrice>, string>>,
  Expect<Equal<Parameters<typeof line>, [char: string, width?: number]>>,
  Expect<Equal<ReturnType<typeof line>, string>>,
];

// @ts-expect-error 文字列は足せない
add('1', 2);
// @ts-expect-error 配列でなければならない
average(1, 2, 3);
// @ts-expect-error withTax は true か false
formatPrice(100, 'yes');
