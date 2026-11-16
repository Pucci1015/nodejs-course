// 練習問題3: TaskRepo を使う Express のルータを、型を付けて書いてください。要件は README にあります。
// 確かめ方: node --test routes.test.ts
import express from 'express';
import type { TaskRepo } from './task-repo.ts';

export function createTaskRouter(repo: TaskRepo): express.Router {
  const router = express.Router();
  // ここを書く
  return router;
}
