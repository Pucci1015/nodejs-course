// 第49章 2.3節: BFF（画面のための API）。ブラウザは、このアプリの /api/tasks を呼び、合言葉を知らなくてよい
import { z } from 'zod';
import { ApiError, createTask, isStatus, listTasks } from '../../../lib/api.ts';

/** problem+json（第5部 第25章）で失敗を返す */
const problem = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status, headers: { 'Content-Type': 'application/problem+json' } });

/** GET /api/tasks?status=todo: 一覧を、画面に要る項目だけにして返す */
export async function GET(request: Request) {
  // クエリは、request.url（http://… から始まる文字）を URL にしてから読む
  const wanted = new URL(request.url).searchParams.get('status');
  if (wanted !== null && !isStatus(wanted)) return problem(400, { title: 'status は todo・doing・done のどれかです' });
  const { items } = await listTasks({ status: wanted ?? undefined });
  return Response.json(items.map(({ id, title, status }) => ({ id, title, status })));
}

const InputSchema = z.object({
  title: z.string('title は文字です').trim().min(1, '題名を入れてください').max(100, '題名は 100 文字までです'),
  dueDate: z.iso.date('dueDate は YYYY-MM-DD です').nullable().default(null),
});

/** POST /api/tasks: JSON を確かめてから、API に作ってもらう */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => undefined);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return problem(400, {
      title: '送られた内容が正しくありません',
      errors: parsed.error.issues.map((i) => ({ pointer: `#/${i.path.join('/')}`, detail: i.message })),
    });
  }
  try {
    const task = await createTask(parsed.data);
    return Response.json(task, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) return problem(err.status, err.problem);
    throw err;
  }
}
