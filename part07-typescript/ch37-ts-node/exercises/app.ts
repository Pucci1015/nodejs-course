// 練習問題8（発展）: TaskRepo を使う、型の付いた小さな API を書いてください。要件は README にあります。
// 確かめ方: node --test app.test.ts
import express from 'express';
import type { TaskRepo } from './task-repo.ts';

export function createApp(repo: TaskRepo): express.Express {
  const app = express();
  // ここを書く
  return app;
}
