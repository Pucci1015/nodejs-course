// 練習問題5 の型の確かめ（書き換えない）
import { z } from 'zod';
import type { Equal, Expect } from './type-assert.ts';
import { type Problem, type Result, parseOrProblem, toPointer, toProblem } from './problem.ts';

const NewTask = z.object({ title: z.string(), tags: z.array(z.string()).default([]) });
export const r = parseOrProblem(NewTask, {});
export const r2 = parseOrProblem(z.string().transform((s) => s.length), 'abc', 400);

export type Checks = [
  Expect<Equal<typeof r, Result<{ title: string; tags: string[] }, Problem>>>,
  Expect<Equal<typeof r2, Result<number, Problem>>>,
  Expect<Equal<ReturnType<typeof toPointer>, string>>,
  Expect<Equal<ReturnType<typeof toProblem>, Problem>>,
];

// @ts-expect-error status は 400 か 422 だけ
parseOrProblem(NewTask, {}, 500);
