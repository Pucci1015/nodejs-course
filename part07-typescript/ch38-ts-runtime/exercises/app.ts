// 練習問題8（発展）: 第37章の練習問題8の API を、Zod で書き直してください。要件は README にあります。
// 確かめ方: node --test app.test.ts
import express from 'express';
import { z } from 'zod';
import type { TaskRepo } from './task-repo.ts';

export function createApp(repo: TaskRepo): express.Express {
  const app = express();
  // ここを書く
  return app;
}
