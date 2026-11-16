// 練習問題7 の模範解答
import { z } from 'zod';

export const Status = z.enum(['todo', 'doing', 'done']);
export const Task = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  status: Status,
  dueDate: z.iso.date().nullable(),
  createdAt: z.iso.datetime(),
});
export type Status = z.infer<typeof Status>;
export type Task = z.infer<typeof Task>;
export type NewTaskInput = { title: string; status?: Status; dueDate?: string | null };

export type UpstreamErrorKind = 'network' | 'status' | 'shape';

/** タスクの API が、思った応答を返さなかった */
export class UpstreamError extends Error {
  readonly kind: UpstreamErrorKind;
  readonly status: number | null;

  constructor(kind: UpstreamErrorKind, status: number | null, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'UpstreamError';
    this.kind = kind;
    this.status = status;
  }
}

export function createTaskClient(baseUrl: string, fetchFn: typeof fetch = fetch) {
  /** 送って応答を受け取る。つながらなければ network */
  async function send(path: string, init?: RequestInit): Promise<Response> {
    try {
      return await fetchFn(`${baseUrl}${path}`, init);
    } catch (err) {
      throw new UpstreamError('network', null, `${path} につながりません`, { cause: err });
    }
  }

  /** 応答のボディを schema で確かめる。JSON として読めない・形が違うなら shape */
  async function read<S extends z.ZodType>(res: Response, schema: S): Promise<z.output<S>> {
    let body: unknown;
    try {
      body = await res.json();
    } catch (err) {
      throw new UpstreamError('shape', res.status, '応答が JSON ではありません', { cause: err });
    }
    const result = schema.safeParse(body);
    if (!result.success) throw new UpstreamError('shape', res.status, '応答の形が違います', { cause: result.error });
    return result.data;
  }

  function fail(res: Response): never {
    throw new UpstreamError('status', res.status, `${res.status} が返りました`);
  }

  return {
    async getTask(id: number): Promise<Task | null> {
      const res = await send(`/api/tasks/${id}`);
      if (res.status === 404) return null;
      if (!res.ok) fail(res);
      return read(res, Task);
    },

    async listTasks(status?: Status): Promise<Task[]> {
      const res = await send(status === undefined ? '/api/tasks' : `/api/tasks?status=${status}`);
      if (!res.ok) fail(res);
      return read(res, z.array(Task));
    },

    async createTask(input: NewTaskInput): Promise<Task> {
      const res = await send('/api/tasks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.status !== 201) fail(res);
      return read(res, Task);
    },
  };
}
