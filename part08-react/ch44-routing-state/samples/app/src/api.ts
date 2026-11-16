// 第43章の api.ts に、1つ読む getTask と、並べ方を選べる listTasks を足したもの
import { z } from 'zod';
import { PageSchema, TaskSchema, type Status, type Task, type TaskInput } from './schemas.ts';

const ProblemSchema = z.object({
  title: z.string().optional(),
  detail: z.string().optional(),
  errors: z.array(z.object({ pointer: z.string().optional(), parameter: z.string().optional(), detail: z.string() })).optional(),
});
export type Problem = z.infer<typeof ProblemSchema>;

export class ApiError extends Error {
  readonly status: number;
  readonly problem: Problem;
  constructor(status: number, problem: Problem) {
    super(problem.detail ?? problem.title ?? `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`/api${path}`, init);
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({}));
    const parsed = ProblemSchema.safeParse(body);
    throw new ApiError(res.status, parsed.success ? parsed.data : {});
  }
  return res.status === 204 ? null : res.json();
}

export async function listTasks(status: Status | 'all', sort: string, signal?: AbortSignal): Promise<Task[]> {
  const q = new URLSearchParams({ sort, limit: '100' });
  if (status !== 'all') q.set('status', status);
  return PageSchema.parse(await request(`/tasks?${q}`, { signal })).items;
}

export async function getTask(id: number, signal?: AbortSignal): Promise<Task> {
  return TaskSchema.parse(await request(`/tasks/${id}`, { signal }));
}

export async function createTask(input: TaskInput): Promise<Task> {
  return TaskSchema.parse(await request('/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }));
}
