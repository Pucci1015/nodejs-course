// 第43章の schemas.ts と同じ
import { z } from 'zod';

z.config(z.locales.ja());

export const STATUSES = ['todo', 'doing', 'done'] as const;
export type Status = (typeof STATUSES)[number];

export const TaskSchema = z.object({
  id: z.number(),
  title: z.string(),
  status: z.enum(STATUSES),
  dueDate: z.string().nullable(),
  version: z.number(),
});
export type Task = z.infer<typeof TaskSchema>;

export const PageSchema = z.object({ items: z.array(TaskSchema), nextCursor: z.string().nullable() });

// 5節: フォームから送る前に確かめる。API の決まり（題名は 1〜100 文字、締め切りは YYYY-MM-DD）と同じにする
export const TaskInputSchema = z.object({
  title: z.string().trim().min(1, '題名を入れてください').max(100, '題名は 100 文字までです'),
  // <input type="date"> は、空なら '' を返す。'' は「締め切り無し」（null）にする
  dueDate: z
    .string()
    .transform((s) => (s === '' ? null : s))
    .pipe(z.iso.date('締め切りは YYYY-MM-DD の日付です').nullable()),
});
// フォームから受け取る形（入力）と、確かめた後の形（出力）
export type TaskFormValues = z.input<typeof TaskInputSchema>;
export type TaskInput = z.output<typeof TaskInputSchema>;
