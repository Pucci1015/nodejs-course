// 練習問題6 の型の確かめ（書き換えない）
import type { Equal, Expect } from './type-assert.ts';
import { assertTask, isStatus, isTask, parseTasks, type Status, type Task } from './guards.ts';

declare const v: unknown;
if (isTask(v)) {
  const t: Task = v; // isTask が true なら Task
  console.log(t);
}
if (isStatus(v)) {
  const s: Status = v;
  console.log(s);
}
declare const w: unknown;
assertTask(w);
const t2: Task = w; // assertTask の後なら Task

declare const list: unknown[];
const onlyTasks = list.filter(isTask);
export type Checks = [Expect<Equal<typeof onlyTasks, Task[]>>, Expect<Equal<ReturnType<typeof parseTasks>, Task[]>>];
console.log(t2);
