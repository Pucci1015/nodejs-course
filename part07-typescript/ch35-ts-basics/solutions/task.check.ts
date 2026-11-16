// 練習問題2 の型の確かめ（書き換えない）
import type { Equal, Expect } from './type-assert.ts';
import { createTask, isOverdue, toggle, type Task } from './task.ts';

export type Checks = [
  Expect<Equal<Parameters<typeof createTask>, [id: number, title: string, dueDate?: string]>>,
  Expect<Equal<ReturnType<typeof createTask>, Task>>,
  Expect<Equal<Parameters<typeof isOverdue>, [task: Task, today: string]>>,
  Expect<Equal<ReturnType<typeof isOverdue>, boolean>>,
  Expect<Equal<Parameters<typeof toggle>, [task: Task]>>,
  Expect<Equal<ReturnType<typeof toggle>, Task>>,
];

const ok1: Task = { id: 1, title: '牛乳を買う', done: false };
const ok2: Task = { id: 2, title: '本を返す', done: true, dueDate: '2026-11-20' };

// @ts-expect-error title が無い
const ng1: Task = { id: 3, done: false };
// @ts-expect-error done は boolean
const ng2: Task = { id: 4, title: 'a', done: 'no' };
// @ts-expect-error 知らない項目は書けない
const ng3: Task = { id: 5, title: 'a', done: false, memo: 'x' };
// @ts-expect-error id は読むだけ（readonly）
ok1.id = 10;
ok2.title = '書き換えられる';
console.log(ng1, ng2, ng3);
