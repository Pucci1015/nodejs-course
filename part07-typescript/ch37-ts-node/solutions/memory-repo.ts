// 練習問題5 の模範解答
import type { Task, TaskRepo } from './task-repo.ts';

export function createMemoryTaskRepo(now: () => Date = () => new Date()): TaskRepo {
  const tasks = new Map<number, Task>();
  let nextId = 1;

  // 中のオブジェクトをそのまま返すと、呼んだ側が書き換えたときに中のデータまで変わってしまう。写して返す
  const copy = (t: Task): Task => ({ ...t });

  // 戻り値の型 TaskRepo から、各メソッドの引数の型が推論される（filter・id・patch に型を書かなくてよい）
  return {
    async list(filter = {}) {
      return [...tasks.values()]
        .filter((t) => filter.status === undefined || t.status === filter.status)
        .filter((t) => filter.dueBefore === undefined || (t.dueDate !== null && t.dueDate < filter.dueBefore))
        .toSorted((a, b) => a.id - b.id)
        .map(copy);
    },

    async get(id) {
      const t = tasks.get(id);
      return t === undefined ? null : copy(t);
    },

    async create(input) {
      const at = now().toISOString();
      const task: Task = {
        id: nextId++,
        title: input.title,
        status: input.status ?? 'todo',
        dueDate: input.dueDate ?? null,
        createdAt: at,
        updatedAt: at,
        version: 1,
      };
      tasks.set(task.id, task);
      return copy(task);
    },

    async update(id, patch, options = {}) {
      const current = tasks.get(id);
      if (current === undefined) return null;
      if (options.expectedVersion !== undefined && options.expectedVersion !== current.version) return null;
      const next: Task = { ...current, updatedAt: now().toISOString(), version: current.version + 1 };
      if (patch.title !== undefined) next.title = patch.title;
      if (patch.status !== undefined) next.status = patch.status;
      if (patch.dueDate !== undefined) next.dueDate = patch.dueDate;
      tasks.set(id, next);
      return copy(next);
    },

    async remove(id) {
      return tasks.delete(id); // Map の delete は、あったら true
    },
  };
}
