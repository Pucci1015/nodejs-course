// 練習問題3: タスクのルートを express.Router にまとめる関数を作ってください。
// 要件は README にあります。
// 確かめ方: node --test tasks-router.test.mjs
import express from 'express';

export function createTasksRouter(tasks) {
  const router = express.Router();
  // ここを書く
  return router;
}
