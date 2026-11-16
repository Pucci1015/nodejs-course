// 練習問題1 の模範解答
import { z } from 'zod';

export const Status = z.enum(['todo', 'doing', 'done']);

export const Task = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(100),
  status: Status,
  dueDate: z.iso.date().nullable(),
  tags: z.array(z.string()),
  createdAt: z.iso.datetime(),
});

export const NewTask = z.strictObject({
  title: z.string().trim().min(1).max(100),
  status: Status.default('todo'),
  dueDate: z.iso.date().nullable().default(null),
  tags: z.array(z.string().trim().min(1).max(20)).max(5).default([]),
});

export const TaskPatch = z
  .strictObject({
    title: z.string().trim().min(1).max(100).optional(),
    status: Status.optional(),
    dueDate: z.iso.date().nullable().optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, { error: '変える項目が1つもありません' });

export type Status = z.infer<typeof Status>;
export type Task = z.infer<typeof Task>;
export type NewTaskInput = z.input<typeof NewTask>;
export type NewTask = z.output<typeof NewTask>;
export type TaskPatch = z.infer<typeof TaskPatch>;
