// 練習問題1 の型の確かめ（書き換えない）
import type { Equal, Expect } from './type-assert.ts';
import type { NewTask, NewTaskInput, Status, Task, TaskPatch } from './schemas.ts';

export type Checks = [
  Expect<Equal<Status, 'todo' | 'doing' | 'done'>>,
  Expect<
    Equal<Task, { id: number; title: string; status: 'todo' | 'doing' | 'done'; dueDate: string | null; tags: string[]; createdAt: string }>
  >,
  Expect<Equal<NewTaskInput, { title: string; status?: 'todo' | 'doing' | 'done' | undefined; dueDate?: string | null | undefined; tags?: string[] | undefined }>>,
  Expect<Equal<NewTask, { title: string; status: 'todo' | 'doing' | 'done'; dueDate: string | null; tags: string[] }>>,
  Expect<Equal<TaskPatch, { title?: string | undefined; status?: 'todo' | 'doing' | 'done' | undefined; dueDate?: string | null | undefined }>>,
];
