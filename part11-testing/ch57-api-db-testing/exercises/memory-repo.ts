// 練習問題で使う、本文の samples のコピー（書き換えなくてよい）。第57章 4節: メモリに覚える、偽物のリポジトリ（フェイク）。TaskRepo と同じ形にする
import { ConflictError, type NewTask, type Status, type Task, type TaskRepo } from './types.ts';

export function createMemoryRepo(seed: Task[] = []): TaskRepo {
  const tasks = new Map<number, Task>(seed.map((task) => [task.id, { ...task }]));
  let nextId = Math.max(0, ...tasks.keys()) + 1;

  // 返すときはコピーにする（呼んだ側が書き換えても、中の値が変わらないように）
  const copy = (task: Task): Task => ({ ...task });

  return {
    async list() {
      return [...tasks.values()].sort((a, b) => a.id - b.id).map(copy);
    },
    async get(id) {
      const task = tasks.get(id);
      return task && copy(task);
    },
    async insert({ title, dueDate }: NewTask) {
      // PostgreSQL の部分ユニークインデックス（終わっていない同じ題名）と同じ決まり
      for (const task of tasks.values()) {
        if (task.title === title && task.status !== 'done') throw new ConflictError(`同じ題名のタスクがあります: ${title}`);
      }
      const task: Task = { id: nextId++, title, status: 'todo', dueDate };
      tasks.set(task.id, task);
      return copy(task);
    },
    async setStatus(id, status: Status) {
      const task = tasks.get(id);
      if (task === undefined) return undefined;
      task.status = status;
      return copy(task);
    },
    async remove(id) {
      return tasks.delete(id);
    },
    async countByStatus(status) {
      return [...tasks.values()].filter((task) => task.status === status).length;
    },
  } satisfies TaskRepo;
}
