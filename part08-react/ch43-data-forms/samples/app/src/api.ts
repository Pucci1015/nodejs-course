// 第43章 1節: 第39章の request を TypeScript にした。失敗は ApiError（problem+json の中身を持つ）、成功はスキーマで確かめる
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
    // problem+json でない応答（プロキシの 502 など）でも ApiError にする
    const body: unknown = await res.json().catch(() => ({}));
    const parsed = ProblemSchema.safeParse(body);
    throw new ApiError(res.status, parsed.success ? parsed.data : {});
  }
  return res.status === 204 ? null : res.json();
}

const json = (method: string, body: unknown, headers: Record<string, string> = {}): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

export async function listTasks(status: Status | 'all', signal?: AbortSignal): Promise<Task[]> {
  const q = new URLSearchParams({ sort: 'dueDate', limit: '100' });
  if (status !== 'all') q.set('status', status);
  return PageSchema.parse(await request(`/tasks?${q}`, { signal })).items;
}

export async function createTask(input: TaskInput): Promise<Task> {
  return TaskSchema.parse(await request('/tasks', json('POST', input)));
}

// If-Match に、読んだときの version（ETag は "version" の形）を入れる。ほかの人が先に変えていたら 412
export async function updateTask(task: Pick<Task, 'id' | 'version'>, patch: Partial<Pick<Task, 'title' | 'status' | 'dueDate'>>): Promise<Task> {
  return TaskSchema.parse(await request(`/tasks/${task.id}`, json('PATCH', patch, { 'If-Match': `"${task.version}"` })));
}

export async function deleteTask(task: Pick<Task, 'id' | 'version'>): Promise<void> {
  await request(`/tasks/${task.id}`, { method: 'DELETE', headers: { 'If-Match': `"${task.version}"` } });
}
