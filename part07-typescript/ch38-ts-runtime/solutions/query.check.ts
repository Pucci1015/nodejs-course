// 練習問題3 の型の確かめ（書き換えない）
import type { Equal, Expect } from './type-assert.ts';
import { type ListQuery, type ListQueryResult, parseListQuery } from './query.ts';

export type Checks = [
  Expect<Equal<ListQuery, { status?: 'todo' | 'doing' | 'done' | undefined; dueBefore?: string | undefined; limit: number; offset: number }>>,
  Expect<Equal<Parameters<typeof parseListQuery>, [query: unknown]>>,
  Expect<Equal<ReturnType<typeof parseListQuery>, ListQueryResult>>,
];

declare const r: ListQueryResult;
if (r.ok) {
  const limit: number = r.value.limit;
  console.log(limit);
} else {
  const names: string[] = r.errors.map((e) => e.parameter);
  console.log(names);
}
