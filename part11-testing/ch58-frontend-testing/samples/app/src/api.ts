// 第58章: API を呼ぶ関数（第8部 第43章と同じ形）。応答は Zod で確かめる
import { z } from 'zod';

export const TaskSchema = z.object({ id: z.number().int(), title: z.string(), done: z.boolean() });
export type Task = z.infer<typeof TaskSchema>;

const ListSchema = z.object({ items: z.array(TaskSchema) });
const ProblemSchema = z.object({
  title: z.string(),
  errors: z.array(z.object({ pointer: z.string(), detail: z.string() })).optional(),
});

/** API が 400 番台・500 番台を返したときの例外。message は、画面にそのまま出せる文 */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const headers = init.body === undefined ? undefined : { 'Content-Type': 'application/json' };
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const problem = ProblemSchema.safeParse(await res.json().catch(() => undefined));
    // 項目ごとのエラーがあれば、その説明を。無ければ problem の題
    const message = problem.success ? (problem.data.errors?.[0]?.detail ?? problem.data.title) : `HTTP ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return res.status === 204 ? undefined : res.json();
}

export async function fetchTasks(signal?: AbortSignal): Promise<Task[]> {
  return ListSchema.parse(await request('/api/tasks', { signal })).items;
}

export async function createTask(title: string): Promise<Task> {
  return TaskSchema.parse(await request('/api/tasks', { method: 'POST', body: JSON.stringify({ title }) }));
}

export async function updateTask(id: number, done: boolean): Promise<Task> {
  return TaskSchema.parse(await request(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ done }) }));
}

export async function deleteTask(id: number): Promise<void> {
  await request(`/api/tasks/${id}`, { method: 'DELETE' });
}
