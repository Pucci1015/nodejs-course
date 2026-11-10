// 練習問題2: タスクを作るときの入力の形を、zod のスキーマで書いてください。
// 要件は README にあります。
// 確かめ方: node --test task-schema.test.mjs
import { z } from 'zod';

// ここを書く（z.strictObject({ … }) にする）
export const CreateTask = z.any();
