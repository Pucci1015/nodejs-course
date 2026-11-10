// 練習問題5: タスクの REST API を Express で書く
// 第2部 第10章・第4部 第18章で、if 文や自作の Router で書いた API と同じものを、Express で書きます。
// 要件は exercises/README.md の問題5の表です。確かめ方:
//   $ node --test tasks-app.test.mjs
import express from 'express';

/**
 * @param {{ store: ReturnType<import('./tasks-store.mjs').createTaskStore> }} deps
 * @returns {import('express').Express}
 */
export function createTasksApp({ store }) {
  const app = express();
  app.disable('x-powered-by');

  // 一覧（?done=true / ?done=false）
  app.get('/api/tasks', (req, res) => {
    res.json(store.list());
    // ここを書く: ?done の確かめと絞り込み
  });

  // ここを書く: GET /api/tasks/:id、POST /api/tasks、PATCH /api/tasks/:id、DELETE /api/tasks/:id

  // ここを書く: どのルートにもあてはまらないときの 404（JSON）と、エラーハンドラ（JSON）

  return app;
}
