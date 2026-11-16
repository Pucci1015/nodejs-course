// 練習問題5 の型の確かめ（書き換えない）
import type { Equal, Expect } from './type-assert.ts';
import { applyPatch, countStatuses, toSummary } from './task-types.ts';
import type { NewTask, Status, StatusCounts, Task, TaskPatch, TaskSummary } from './task-types.ts';

export type Checks = [
  Expect<Equal<NewTask, { title: string; status: Status; dueDate: string | null; tags: string[] }>>,
  Expect<Equal<TaskPatch, { title?: string; status?: Status; dueDate?: string | null; tags?: string[] }>>,
  Expect<Equal<TaskSummary, { id: number; title: string; status: Status }>>,
  Expect<Equal<StatusCounts, { todo: number; doing: number; done: number }>>,
  Expect<Equal<Parameters<typeof applyPatch>, [task: Task, patch: TaskPatch, now: string]>>,
  Expect<Equal<ReturnType<typeof applyPatch>, Task>>,
  Expect<Equal<Parameters<typeof toSummary>, [task: Task]>>,
  Expect<Equal<ReturnType<typeof toSummary>, TaskSummary>>,
  Expect<Equal<Parameters<typeof countStatuses>, [tasks: Task[]]>>,
  Expect<Equal<ReturnType<typeof countStatuses>, StatusCounts>>,
];

declare const task: Task;
// @ts-expect-error id は変えられない
applyPatch(task, { id: 2 }, '2026-11-11T00:00:00.000Z');
// @ts-expect-error 状態は3つのどれか
applyPatch(task, { status: 'waiting' }, '2026-11-11T00:00:00.000Z');
