// 練習問題1 の型の確かめ（書き換えない）
import type { Equal, Expect } from './type-assert.ts';
import { countText, main, topWords } from './wordcount.ts';

export type Checks = [
  Expect<Equal<Parameters<typeof countText>, [text: string]>>,
  Expect<Equal<ReturnType<typeof countText>, { lines: number; words: number; chars: number }>>,
  Expect<Equal<Parameters<typeof topWords>, [text: string, n: number]>>,
  Expect<Equal<ReturnType<typeof topWords>, { word: string; count: number }[]>>,
  Expect<Equal<Parameters<typeof main>, [argv: string[]]>>,
  Expect<Equal<ReturnType<typeof main>, Promise<number>>>,
];
