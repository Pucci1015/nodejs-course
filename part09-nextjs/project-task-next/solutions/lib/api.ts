// 第7部の API を呼ぶ関数。サーバだけで動く（第48章 4節・第49章 2.2節）
import 'server-only';
import { z } from 'zod';
import type { Filters } from './filters.ts';
import { PageSchema, TaskSchema, type Page, type Task, type TaskInput, type TaskPatch } from './schemas.ts';

// つなぐ API の場所。API_URL=http://127.0.0.1:9500 npm run dev のように変えられる
const API_URL = process.env.API_URL ?? 'http://127.0.0.1:9490';

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
  const res = await fetch(`${API_URL}/api${path}`, init);
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({}));
    const parsed = ProblemSchema.safeParse(body);
    throw new ApiError(res.status, parsed.success ? parsed.data : {});
  }
  return res.status === 204 ? null : res.json();
}

const jsonInit = (method: string, body: unknown, headers: Record<string, string> = {}): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

/** 一覧の1ページ。API に送る順は status・sort・limit・cursor。sort はいつも送る（API の既定と違うので） */
export async function listTasks(filters: Filters, cursor?: string): Promise<Page> {
  const q = new URLSearchParams();
  if (filters.statuses.length > 0) q.set('status', filters.statuses.join(','));
  q.set('sort', filters.sort);
  q.set('limit', '20');
  if (cursor !== undefined) q.set('cursor', cursor);
  return PageSchema.parse(await request(`/tasks?${q}`));
}

/** 1つ読む。無ければ null */
export async function getTask(id: number): Promise<Task | null> {
  try {
    return TaskSchema.parse(await request(`/tasks/${id}`));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** 作る。第8部と違い、冪等キーは付けない（2回送らない工夫は、成果物の README 3.3節） */
export async function createTask(input: TaskInput): Promise<Task> {
  return TaskSchema.parse(await request('/tasks', jsonInit('POST', input)));
}

/** If-Match に、読んだときの version を入れる。ほかの人が先に変えていたら 412 */
export async function updateTask(task: Pick<Task, 'id' | 'version'>, patch: TaskPatch): Promise<Task> {
  return TaskSchema.parse(await request(`/tasks/${task.id}`, jsonInit('PATCH', patch, { 'If-Match': `"${task.version}"` })));
}

export async function deleteTask(task: Pick<Task, 'id' | 'version'>): Promise<void> {
  await request(`/tasks/${task.id}`, { method: 'DELETE', headers: { 'If-Match': `"${task.version}"` } });
}

/** problem+json の errors を「項目の名前 → 文」にする */
export function toFieldErrors(problem: Problem): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of problem.errors ?? []) {
    const name = e.pointer !== undefined ? (e.pointer.replace(/^#\//, '').split('/')[0] ?? '') : (e.parameter ?? '');
    out[name] ??= e.detail;
  }
  return out;
}

/** API の SSE（/api/events）につなぐ */
export async function openEvents(signal: AbortSignal): Promise<Response> {
  return fetch(`${API_URL}/api/events`, { headers: { Accept: 'text/event-stream' }, signal });
}
