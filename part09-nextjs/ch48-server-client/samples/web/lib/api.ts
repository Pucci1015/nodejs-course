// 第47章 5節・第48章 4節: 練習用の API を呼ぶ関数。サーバだけで動く
import 'server-only'; // 第48章 4節: このファイルをブラウザ用の部品から import すると、エラーになる
import { z } from 'zod';

// つなぐ API の場所。API_URL=http://127.0.0.1:9516 npx next dev のように変えられる
const API_URL = process.env.API_URL ?? 'http://127.0.0.1:9500';
// 第48章 4節: API に送る合言葉（の練習）。サーバだけが知っていればよい値。dev-only- は開発用の仮の値の印
const API_TOKEN = process.env.API_TOKEN ?? 'dev-only-token';
const headers = { Authorization: `Bearer ${API_TOKEN}` };

export const STATUSES = ['todo', 'doing', 'done'] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABELS: Record<Status, string> = { todo: '未着手', doing: '作業中', done: '完了' };

// 第7部の API の Task と同じ形（第8部の成果物の schemas.ts と同じ）
export const TaskSchema = z.object({
  id: z.number(),
  title: z.string(),
  status: z.enum(STATUSES),
  dueDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
  version: z.number(),
});
export type Task = z.infer<typeof TaskSchema>;

const PageSchema = z.object({ items: z.array(TaskSchema), nextCursor: z.string().nullable() });
export type Page = z.infer<typeof PageSchema>;

export const isStatus = (v: unknown): v is Status => typeof v === 'string' && (STATUSES as readonly string[]).includes(v);

/** 一覧の1ページ。status を渡せば、その状態のものだけ */
export async function listTasks({ status, cursor }: { status?: Status; cursor?: string } = {}): Promise<Page> {
  const q = new URLSearchParams({ sort: 'createdAt', limit: '20' });
  if (status) q.set('status', status);
  if (cursor) q.set('cursor', cursor);
  const res = await fetch(`${API_URL}/api/tasks?${q}`, { headers });
  if (!res.ok) throw new Error(`タスクを読めませんでした（${res.status}）`);
  return PageSchema.parse(await res.json());
}

/** 1つ読む。無ければ null */
export async function getTask(id: number): Promise<Task | null> {
  const res = await fetch(`${API_URL}/api/tasks/${id}`, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`タスクを読めませんでした（${res.status}）`);
  return TaskSchema.parse(await res.json());
}
