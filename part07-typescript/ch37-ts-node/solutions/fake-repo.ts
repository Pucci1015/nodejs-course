// テストの部品: 決まったタスクを返すだけの TaskRepo（練習問題3・8 のテストが使う）。書き換えなくてよいファイル
import type { Task, TaskRepo } from './task-repo.ts';

export function task(id: number, fields: Partial<Task> = {}): Task {
  return {
    id,
    title: `タスク${id}`,
    status: 'todo',
    dueDate: null,
    createdAt: '2026-11-11T00:00:00.000Z',
    updatedAt: '2026-11-11T00:00:00.000Z',
    version: 1,
    ...fields,
  };
}

/** tasks を持つだけの簡単なリポジトリ。calls に、呼ばれたメソッドと引数を記録する */
export function createFakeRepo(initial: Task[]): TaskRepo & { calls: unknown[][]; tasks: Task[] } {
  const tasks = [...initial];
  const calls: unknown[][] = [];
  let nextId = Math.max(0, ...tasks.map((t) => t.id)) + 1;
  return {
    tasks,
    calls,
    async list(filter = {}) {
      calls.push(['list', filter]);
      return tasks.filter((t) => (filter.status === undefined || t.status === filter.status) && (filter.dueBefore === undefined || (t.dueDate !== null && t.dueDate < filter.dueBefore)));
    },
    async get(id) {
      calls.push(['get', id]);
      return tasks.find((t) => t.id === id) ?? null;
    },
    async create(input) {
      calls.push(['create', input]);
      const t = task(nextId++, { title: input.title, status: input.status ?? 'todo', dueDate: input.dueDate ?? null });
      tasks.push(t);
      return t;
    },
    async update(id, patch, options = {}) {
      calls.push(['update', id, patch, options]);
      const i = tasks.findIndex((t) => t.id === id);
      const current = tasks[i];
      if (current === undefined) return null;
      if (options.expectedVersion !== undefined && options.expectedVersion !== current.version) return null;
      const next: Task = { ...current, ...patch, version: current.version + 1, updatedAt: '2026-11-12T00:00:00.000Z' };
      tasks[i] = next;
      return next;
    },
    async remove(id) {
      calls.push(['remove', id]);
      const i = tasks.findIndex((t) => t.id === id);
      if (i === -1) return false;
      tasks.splice(i, 1);
      return true;
    },
  };
}
