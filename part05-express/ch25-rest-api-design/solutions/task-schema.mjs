// 練習問題2 の模範解答
import { z } from 'zod';

export const CreateTask = z.strictObject({
  title: z.string().trim().min(1, 'title を入力してください').max(100, 'title は 100 文字までです'),
  status: z.enum(['todo', 'doing', 'done']).default('todo'),
  dueDate: z.iso.date().optional(),
  tags: z.array(z.string().trim().min(1)).max(5).default([]),
});
