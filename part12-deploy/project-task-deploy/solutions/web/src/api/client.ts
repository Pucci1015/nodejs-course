// API を呼ぶ関数。失敗は ApiError、成功はスキーマで確かめる（第43章 1.2節）
// 変更（第10部）: request と jsonInit を、ログインの関数（auth.ts）からも使えるように export した。problem の type も読む
import { z } from 'zod';
import { toSearchParams, type Filters } from '../filters.ts';
import {
  AttachmentListSchema,
  AttachmentSchema,
  PageSchema,
  TaskSchema,
  type Attachment,
  type Page,
  type Task,
  type TaskInput,
  type TaskPatch,
} from './schemas.ts';

const ProblemSchema = z.object({
  type: z.string().optional(), // 追加（第10部）: 'urn:task-api:email-not-verified' など、理由を見分けるため
  title: z.string().optional(),
  detail: z.string().optional(),
  errors: z
    .array(z.object({ pointer: z.string().optional(), parameter: z.string().optional(), detail: z.string() }))
    .optional(),
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

export async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`/api${path}`, init);
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({}));
    const parsed = ProblemSchema.safeParse(body);
    throw new ApiError(res.status, parsed.success ? parsed.data : {});
  }
  return res.status === 204 ? null : res.json();
}

export const jsonInit = (method: string, body: unknown, headers: Record<string, string> = {}): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

// 一覧の1ページ。条件は URL と同じ書き方で API に渡す（q は API に無いので渡さない）
export async function listTasks(filters: Filters, cursor: string | null, signal?: AbortSignal): Promise<Page> {
  const q = toSearchParams({ ...filters, q: '' });
  q.set('sort', filters.sort); // URL では既定の並べ方を省くが、API の既定（-createdAt）とは違うので、いつも送る
  q.set('limit', '20');
  if (cursor !== null) q.set('cursor', cursor);
  return PageSchema.parse(await request(`/tasks?${q}`, { signal }));
}

export async function getTask(id: number, signal?: AbortSignal): Promise<Task> {
  return TaskSchema.parse(await request(`/tasks/${id}`, { signal }));
}

// 2回押しても1つだけ作られるように、冪等キーを付ける（第5部 第25章）
export async function createTask(input: TaskInput, idempotencyKey: string): Promise<Task> {
  return TaskSchema.parse(await request('/tasks', jsonInit('POST', input, { 'Idempotency-Key': idempotencyKey })));
}

// If-Match に、読んだときの version を入れる。ほかの人が先に変えていたら 412（第43章 6節）
export async function updateTask(task: Pick<Task, 'id' | 'version'>, patch: TaskPatch): Promise<Task> {
  return TaskSchema.parse(
    await request(`/tasks/${task.id}`, jsonInit('PATCH', patch, { 'If-Match': `"${task.version}"` })),
  );
}

export async function deleteTask(task: Pick<Task, 'id' | 'version'>): Promise<void> {
  await request(`/tasks/${task.id}`, { method: 'DELETE', headers: { 'If-Match': `"${task.version}"` } });
}

// 追加（第12部）: 添付ファイル
export async function listAttachments(taskId: number, signal?: AbortSignal): Promise<Attachment[]> {
  return AttachmentListSchema.parse(await request(`/tasks/${taskId}/attachments`, { signal })).items;
}

/** ファイルのバイトを、そのままボディにして送る（FormData にしない。種類はサーバが中身で決める） */
export async function uploadAttachment(taskId: number, file: File): Promise<Attachment> {
  const q = new URLSearchParams({ name: file.name });
  return AttachmentSchema.parse(
    await request(`/tasks/${taskId}/attachments?${q.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    }),
  );
}

export async function deleteAttachment(a: Pick<Attachment, 'taskId' | 'id'>): Promise<void> {
  await request(`/tasks/${a.taskId}/attachments/${a.id}`, { method: 'DELETE' });
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
