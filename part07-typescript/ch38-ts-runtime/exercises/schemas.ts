// 練習問題1: タスクのスキーマを Zod で書き、型をスキーマから作ってください。要件は README にあります。
// 確かめ方: node --test schemas.test.ts
import { z } from 'zod';

export const Status = z.enum(['todo', 'doing', 'done']);

// ここに Task・NewTask・TaskPatch のスキーマを書く

export type Status = z.infer<typeof Status>;
// ここに Task・NewTaskInput・NewTask・TaskPatch の型を書く
