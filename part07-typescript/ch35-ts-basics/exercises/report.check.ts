// 練習問題8 の型の確かめ（書き換えない）
import type { Equal, Expect } from './type-assert.ts';
import { formatReport, parseLine, type Task } from './report.ts';

export type Checks = [
  Expect<Equal<Parameters<typeof parseLine>, [line: string]>>,
  Expect<Equal<ReturnType<typeof parseLine>, Task | null>>,
  Expect<Equal<Parameters<typeof formatReport>, [tasks: Task[], today: string]>>,
  Expect<Equal<ReturnType<typeof formatReport>, string>>,
];
