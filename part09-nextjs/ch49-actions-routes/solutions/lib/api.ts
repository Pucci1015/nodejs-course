// 第49章 練習問題: 本文2.2節の lib/api.ts と同じ（このファイルは変えません）
import 'server-only'; // 第48章 4節: このファイルをブラウザ用の部品から import すると、エラーになる
import { z } from 'zod';
import { STATUSES, type Status } from './status.ts';

// つなぐ API の場所。API_URL=http://127.0.0.1:9536 npx next dev のように変えられる
const API_URL = process.env.API_URL ?? 'http://127.0.0.1:9500';
// 第48章 4節: API に送る合言葉（の練習）。サーバだけが知っていればよい値。dev-only- は開発用の仮の値の印
const API_TOKEN = process.env.API_TOKEN ?? 'dev-only-token';
const headers = { Authorization: `Bearer ${API_TOKEN}` };

// 状態の名前は、ブラウザ用の部品でも使うので、別のファイル（server-only でない）に置いた（第49章 3.4節）
export { STATUSES, STATUS_LABELS, isStatus, type Status } from './status.ts';

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

// 第49章 2節: API の失敗（problem+json）。status と、項目ごとの理由を持つ（第8部 第43章の ApiError と同じ形）
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

/** API を呼ぶ。2xx でなければ ApiError を投げる。204 なら null */
async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${API_URL}/api${path}`, { ...init, headers: { ...headers, ...init.headers } });
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({}));
    const parsed = ProblemSchema.safeParse(body);
    throw new ApiError(res.status, parsed.success ? parsed.data : {});
  }
  return res.status === 204 ? null : res.json();
}

const jsonInit = (method: string, body: unknown, extra: Record<string, string> = {}): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json', ...extra },
  body: JSON.stringify(body),
});

/** 一覧の1ページ。status を渡せば、その状態のものだけ */
export async function listTasks({ status, cursor }: { status?: Status; cursor?: string } = {}): Promise<Page> {
  const q = new URLSearchParams({ sort: 'createdAt', limit: '20' });
  if (status) q.set('status', status);
  if (cursor) q.set('cursor', cursor);
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

// ここから第49章: 書き換える関数。Server Action と Route Handler から呼ぶ
export type TaskInput = { title: string; dueDate: string | null };

export async function createTask(input: TaskInput): Promise<Task> {
  return TaskSchema.parse(await request('/tasks', jsonInit('POST', input)));
}

/** If-Match に、読んだときの version を入れる。ほかの人が先に変えていたら 412 の ApiError（第43章 6節） */
export async function updateTask(task: { id: number; version: number }, patch: Partial<TaskInput> & { status?: Status }): Promise<Task> {
  return TaskSchema.parse(await request(`/tasks/${task.id}`, jsonInit('PATCH', patch, { 'If-Match': `"${task.version}"` })));
}

export async function deleteTask(task: { id: number; version: number }): Promise<void> {
  await request(`/tasks/${task.id}`, { method: 'DELETE', headers: { 'If-Match': `"${task.version}"` } });
}

/** problem+json の errors を「項目の名前 → 文」にする（第43章 5.3節） */
export function toFieldErrors(problem: Problem): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of problem.errors ?? []) {
    const name = e.pointer !== undefined ? (e.pointer.replace(/^#\//, '').split('/')[0] ?? '') : (e.parameter ?? '');
    out[name] ??= e.detail;
  }
  return out;
}

/** 第49章 5節: API の SSE（/api/events）につなぐ。合言葉を付けるので、サーバからだけ呼ぶ */
export async function openEvents(signal: AbortSignal): Promise<Response> {
  return fetch(`${API_URL}/api/events`, { headers: { ...headers, Accept: 'text/event-stream' }, signal });
}
