// 練習問題7 の型の確かめ（書き換えない）
import type { Equal, Expect } from './type-assert.ts';
import { createTaskClient, type NewTaskInput, type Task } from './client.ts';

const client = createTaskClient('http://127.0.0.1:9480');
export type Checks = [
  Expect<Equal<Task, { id: number; title: string; status: 'todo' | 'doing' | 'done'; dueDate: string | null; createdAt: string }>>,
  Expect<Equal<Parameters<typeof client.getTask>, [id: number]>>,
  Expect<Equal<ReturnType<typeof client.getTask>, Promise<Task | null>>>,
  Expect<Equal<ReturnType<typeof client.listTasks>, Promise<Task[]>>>,
  Expect<Equal<Parameters<typeof client.createTask>, [input: NewTaskInput]>>,
  Expect<Equal<ReturnType<typeof client.createTask>, Promise<Task>>>,
];

// @ts-expect-error 知らない status は渡せない
void client.listTasks('waiting');
