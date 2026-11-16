// 第40章 5・6節: 第39章の request を TypeScript にした。応答は Zod で確かめる（第38章）
import { z } from 'zod';

export const Task = z.object({
  id: z.number(),
  title: z.string(),
  status: z.enum(['todo', 'doing', 'done']),
  dueDate: z.string().nullable(),
  version: z.number(),
});
export type Task = z.infer<typeof Task>;
const Page = z.object({ items: z.array(Task), nextCursor: z.string().nullable() });

export async function listTasks(): Promise<Task[]> {
  // プロキシがあるので、オリジンを書かずに /api から始める
  const res = await fetch('/api/tasks?limit=100&sort=dueDate');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Page.parse(await res.json()).items;
}
