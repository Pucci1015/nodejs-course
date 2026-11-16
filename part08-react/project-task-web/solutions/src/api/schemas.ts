// API の応答の形と、フォームの入力の形（第43章 1.2節・5.1節）
import { z } from 'zod';

z.config(z.locales.ja());

export const STATUSES = ['todo', 'doing', 'done'] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABELS: Record<Status, string> = { todo: '未着手', doing: '作業中', done: '完了' };

// 第7部の API の types.ts の Task と同じ形
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

export const PageSchema = z.object({ items: z.array(TaskSchema), nextCursor: z.string().nullable() });
export type Page = z.infer<typeof PageSchema>;

// フォームの決まり（API と同じ: 題名は前後の空白を除いて 1〜100 文字、締め切りは YYYY-MM-DD か無し）
export const TaskInputSchema = z.object({
  title: z.string().trim().min(1, '題名を入れてください').max(100, '題名は 100 文字までです'),
  dueDate: z
    .string()
    .transform((s) => (s === '' ? null : s))
    .pipe(z.iso.date('締め切りは YYYY-MM-DD の日付です').nullable()),
});
export type TaskFormValues = z.input<typeof TaskInputSchema>;
export type TaskInput = z.output<typeof TaskInputSchema>;

export type TaskPatch = Partial<{ title: string; status: Status; dueDate: string | null }>;
