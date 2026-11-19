// API を呼ぶ関数。失敗は ApiError、成功はスキーマで確かめる（第43章 1.2節）
import { z } from 'zod';

const ProblemSchema = z.object({
  type: z.string().optional(), // 'urn:room-booking:email-not-verified' など、理由を見分けるため
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

/** problem+json の errors を「項目の名前 → 文」にする（第43章 5.3節） */
export function toFieldErrors(problem: Problem): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of problem.errors ?? []) {
    const name = e.pointer !== undefined ? (e.pointer.replace(/^#\//, '').split('/')[0] ?? '') : (e.parameter ?? '');
    out[name] ??= e.detail;
  }
  return out;
}
