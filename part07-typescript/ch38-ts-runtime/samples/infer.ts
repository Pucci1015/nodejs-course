// 2節: スキーマから型を作る。z.infer・z.input・z.output
import { z } from 'zod';

z.config(z.locales.ja()); // 間違いの文を日本語にする（第5部 第25章）

// スキーマ（実行時に確かめるもの）を1回だけ書く
export const Status = z.enum(['todo', 'doing', 'done']);
export const Task = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(100),
  status: Status,
  dueDate: z.iso.date().nullable(), // 'YYYY-MM-DD' か null
  tags: z.array(z.string()),
});

// 型は、スキーマから取り出す（同じ名前でよい。値と型は別の世界なので、ぶつからない）
export type Status = z.infer<typeof Status>; // 'todo' | 'doing' | 'done'
export type Task = z.infer<typeof Task>;

const text = '{"id": 7, "title": "牛乳を買う", "status": "todo", "dueDate": null, "tags": ["家"]}';
const task: Task = Task.parse(JSON.parse(text)); // 形が違えば ZodError を投げる。通れば Task
console.log(task.tags.length);

const bad = Task.safeParse(JSON.parse('{"id": "7", "title": "牛乳を買う"}'));
if (!bad.success) console.log(z.prettifyError(bad.error));

// 入る型と出る型が違うスキーマ: default と transform
export const NewTask = z.object({
  title: z.string().trim().min(1).max(100),
  status: Status.default('todo'),
  tags: z.array(z.string()).default([]),
  dueDate: z.iso.date().nullable().default(null),
});
export type NewTaskInput = z.input<typeof NewTask>; // 送る側: status・tags・dueDate は省略できる
export type NewTask = z.output<typeof NewTask>; // 確かめた後: 全部そろっている（z.infer と同じ）

const input: NewTaskInput = { title: '  本を返す ' };
const created: NewTask = NewTask.parse(input);
console.log(created);
