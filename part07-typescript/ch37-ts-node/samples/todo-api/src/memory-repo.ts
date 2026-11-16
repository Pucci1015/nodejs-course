// 4.2節: TaskRepo をメモリで作る
import type { NewTask, Task, TaskRepo } from './task.ts';

export function createMemoryTaskRepo(now: () => Date = () => new Date()): TaskRepo {
  const tasks = new Map<number, Task>();
  let nextId = 1;

  return {
    async list(filter = {}) {
      const all = [...tasks.values()];
      return filter.status === undefined ? all : all.filter((t) => t.status === filter.status);
    },
    async get(id) {
      return tasks.get(id) ?? null;
    },
    async create(input: NewTask) {
      const task: Task = { id: nextId++, title: input.title, status: input.status ?? 'todo', createdAt: now().toISOString() };
      tasks.set(task.id, task);
      return task;
    },
    async remove(id) {
      return tasks.delete(id);
    },
  };
}
