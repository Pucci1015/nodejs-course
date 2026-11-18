// 第57章: タスクのサービス（決まりを持つ層。HTTP もデータベースも知らない）
import { ConflictError, ValidationError, type Status, type Task, type TaskRepo } from './types.ts';

export interface ServiceDeps {
  repo: TaskRepo;
  /** 「今」を返す関数（第56章 5節）。テストでは決まった日を返す */
  now?: () => Date;
  /** 同時に「doing」にできる数 */
  maxDoing?: number;
}

export function createTaskService({ repo, now = () => new Date(), maxDoing = 3 }: ServiceDeps) {
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(now());

  return {
    list: () => repo.list(),
    get: (id: number) => repo.get(id),

    async create(input: { title: string; dueDate?: string | null }): Promise<Task> {
      const title = input.title.trim();
      if (title.length === 0 || title.length > 100) throw new ValidationError('/title', '題名は 1〜100 文字にしてください');
      const dueDate = input.dueDate ?? null;
      // 'YYYY-MM-DD' どうしは、文字列のまま大小を比べられる
      if (dueDate !== null && dueDate < today()) throw new ValidationError('/dueDate', '期限に過去の日は選べません');
      return repo.insert({ title, dueDate });
    },

    async changeStatus(id: number, status: Status): Promise<Task | undefined> {
      const task = await repo.get(id);
      if (task === undefined) return undefined;
      if (status === 'doing' && task.status !== 'doing' && (await repo.countByStatus('doing')) >= maxDoing) {
        throw new ConflictError(`同時に進められるのは ${maxDoing} 個までです`);
      }
      return repo.setStatus(id, status);
    },

    remove: (id: number) => repo.remove(id),
  };
}

export type TaskService = ReturnType<typeof createTaskService>;
