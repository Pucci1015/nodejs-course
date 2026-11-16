// 練習問題8: タスクの API を、ETag と If-Match で上書きの事故を防ぐ形で書いてください。
// 要件は README にあります。
// 試す: node task-app.mjs   （ポート 9428。別のターミナルで curl -i http://127.0.0.1:9428/api/tasks/2）
// 確かめ方: node --test task-app.test.mjs
import http from 'node:http';
import express from 'express';
import { createSqliteTaskRepo } from './task-repo.mjs';
import { statusForDbError } from './sqlite-errors.mjs';
import { createTaskDb } from './task-db.mjs';

class HttpError extends Error {
  constructor(status, detail) {
    super(detail);
    this.status = status;
  }
}
const parseId = (s) => (/^[1-9]\d{0,8}$/.test(s) ? Number(s) : null);

export function createTaskApp(db) {
  const repo = createSqliteTaskRepo(db);
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  app.get('/api/tasks', async (req, res) => {
    res.json(await repo.list());
  });

  // ここを書く: GET /api/tasks/:id、POST /api/tasks、PATCH /api/tasks/:id、DELETE /api/tasks/:id

  // エラーを Problem Details にする（書き換えなくてよい）
  app.use((err, req, res, next) => {
    const dbStatus = statusForDbError(err);
    const known = err instanceof HttpError || err.expose === true;
    const status = known ? err.status : (dbStatus ?? 500);
    if (status === 500) console.error(err);
    res.status(status).type('application/problem+json').json({
      type: 'about:blank',
      title: http.STATUS_CODES[status],
      status,
      detail: known ? err.message : dbStatus ? '送られた値が、データの決まりに合いません' : 'サーバの中でエラーが起きました',
    });
  });
  return app;
}

// node task-app.mjs で直接動かしたときだけ、サーバを立てる（テストから import したときは立てない）
if (import.meta.main) {
  createTaskApp(createTaskDb()).listen(9428, '127.0.0.1', () => console.log('http://127.0.0.1:9428/api/tasks で待っています（Ctrl+C で止める）'));
}
