// 8節: 1つのスキーマから、型・実行時の確かめ・JSON Schema（API の説明書の部品）を作る
import { z } from 'zod';

const NewTask = z.strictObject({
  title: z.string().trim().min(1).max(100),
  status: z.enum(['todo', 'doing', 'done']).default('todo'),
  dueDate: z.iso.date().nullable().default(null),
});

// io: 'input' は「送る側が送ってよい形」（default のある項目は省略できる）
console.log(JSON.stringify(z.toJSONSchema(NewTask, { io: 'input' }), null, 2));
