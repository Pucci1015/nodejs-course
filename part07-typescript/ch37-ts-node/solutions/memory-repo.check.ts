// 練習問題5 の型の確かめ（書き換えない）
import type { Equal, Expect } from './type-assert.ts';
import { createMemoryTaskRepo } from './memory-repo.ts';
import type { TaskRepo } from './task-repo.ts';

const repo: TaskRepo = createMemoryTaskRepo();
const repo2 = createMemoryTaskRepo(() => new Date('2026-11-11T00:00:00Z'));
export type Checks = [Expect<Equal<typeof repo2, TaskRepo>>];
console.log(repo);
