// 練習問題3 の型の確かめ（書き換えない）
import type { Equal, Expect } from './type-assert.ts';
import { chunk, groupBy, indexBy, last, pluck } from './generics.ts';

type Task = { id: number; title: string; status: 'todo' | 'done' };
declare const tasks: Task[]; // 「tasks という Task[] の値がある」と tsc に教えるだけ（型の確かめ用）

const l1 = last([1, 2, 3]);
const l2 = last(tasks);
const p1 = pluck(tasks, 'title');
const p2 = pluck(tasks, 'status');
const g = groupBy(tasks, (t) => t.status);
const i = indexBy(tasks, 'id');
const c = chunk(['a', 'b', 'c'], 2);

export type Checks = [
  Expect<Equal<typeof l1, number | undefined>>,
  Expect<Equal<typeof l2, Task | undefined>>,
  Expect<Equal<typeof p1, string[]>>,
  Expect<Equal<typeof p2, ('todo' | 'done')[]>>,
  Expect<Equal<typeof g, Map<string, Task[]>>>,
  Expect<Equal<typeof i, Map<number, Task>>>,
  Expect<Equal<typeof c, string[][]>>,
];

// @ts-expect-error Task に titel という項目は無い
pluck(tasks, 'titel');
// @ts-expect-error keyOf は文字列を返す関数
groupBy(tasks, (t) => t.id);
// @ts-expect-error size は数
chunk(tasks, '2');
