// 練習問題7 の型の確かめ（書き換えない）
import type { Equal, Expect } from './type-assert.ts';
import { formatSummary, mean, median, sum, summarize } from './stats.ts';

type Summary = { count: number; min: number; max: number; mean: number };

export type Checks = [
  Expect<Equal<Parameters<typeof sum>, [nums: number[]]>>,
  Expect<Equal<ReturnType<typeof sum>, number>>,
  Expect<Equal<ReturnType<typeof mean>, number | null>>,
  Expect<Equal<ReturnType<typeof median>, number | null>>,
  Expect<Equal<ReturnType<typeof summarize>, Summary | null>>,
  Expect<Equal<Parameters<typeof formatSummary>, [summary: Summary | null]>>,
  Expect<Equal<ReturnType<typeof formatSummary>, string>>,
];

// @ts-expect-error 文字列の配列は渡せない
sum(['1', '2']);
