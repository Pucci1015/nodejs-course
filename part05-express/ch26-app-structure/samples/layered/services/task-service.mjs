// サービスの層: タスクの決まり（第26章 3節）
// HTTP（req・res・ステータス）も、データの置き場所（Map・SQL）も知らない。
// 使うもの（repo・clock・maxTasks）は、外から受け取る（4節）
import { ConflictError, NotFoundError, ValidationError } from '../errors.mjs';

/**
 * @param {{ repo: ReturnType<import('../repositories/memory-task-repo.mjs').createMemoryTaskRepo>, clock: () => Date, maxTasks?: number }} deps
 */
export function createTaskService({ repo, clock, maxTasks = 100 }) {
  return {
    list: () => repo.list(),

    async get(id) {
      const task = await repo.get(id);
      if (!task) throw new NotFoundError(`タスク ${id} はありません`);
      return task;
    },

    async create({ title, dueDate }) {
      const t = title.trim();
      if (t === '' || t.length > 100) throw new ValidationError('title は 1〜100 文字です', 'title'); // ルートで確かめていても、ここでも守る
      const today = clock().toISOString().slice(0, 10); // 「今日」は clock から。テストで日付を決められる
      if (dueDate !== undefined && dueDate < today) throw new ValidationError('締め切りが過ぎています', 'dueDate');
      const all = await repo.list();
      if (all.some((x) => x.title === t && x.status !== 'done')) throw new ConflictError('同じ題名の、終わっていないタスクがあります');
      if (all.length >= maxTasks) throw new ConflictError(`タスクは ${maxTasks} 個までです`);
      return repo.insert({ title: t, status: 'todo', dueDate: dueDate ?? null, createdAt: clock().toISOString() });
    },
  };
}
