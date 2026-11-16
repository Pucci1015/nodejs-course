// 練習問題8 の模範解答
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

  const etag = (task) => `"${task.version}"`;

  // If-Match: "3" から 3 を取り出し、今のタスクの version と比べる。無ければ 428、形が違えば 400、違えば 412
  function mustMatch(req, current) {
    const header = req.get('If-Match');
    if (header === undefined) throw new HttpError(428, 'If-Match（読んだときの ETag）を送ってください');
    const m = /^"(\d{1,9})"$/.exec(header);
    if (!m) throw new HttpError(400, 'If-Match の形が違います（例: "3"）');
    if (Number(m[1]) !== current.version) throw new HttpError(412, 'ほかの人が先に変えました。読み直してください');
  }

  function mustBeString(value, name, { nullable = false } = {}) {
    if (typeof value === 'string' || (nullable && value === null)) return value;
    throw new HttpError(422, `${name} は文字列で送ってください`);
  }

  async function mustGet(idText) {
    const task = await repo.get(parseId(idText));
    if (!task) throw new HttpError(404, `タスク ${idText} はありません`);
    return task;
  }

  app.get('/api/tasks/:id', async (req, res) => {
    const task = await mustGet(req.params.id);
    res.set('ETag', etag(task)).json(task);
  });

  app.post('/api/tasks', async (req, res) => {
    const title = mustBeString(req.body?.title, 'title');
    const dueDate = mustBeString(req.body?.dueDate ?? null, 'dueDate', { nullable: true });
    const now = new Date().toISOString();
    const task = await repo.insert({ title, status: 'todo', dueDate, createdAt: now, updatedAt: now, completedAt: null, version: 1 });
    res.status(201).location(`/api/tasks/${task.id}`).set('ETag', etag(task)).json(task);
  });

  app.patch('/api/tasks/:id', async (req, res) => {
    const current = await mustGet(req.params.id); // 無ければ 404
    mustMatch(req, current);
    const fields = { updatedAt: new Date().toISOString(), version: current.version + 1 };
    if (req.body?.title !== undefined) fields.title = mustBeString(req.body.title, 'title');
    if (req.body?.status !== undefined) {
      fields.status = mustBeString(req.body.status, 'status');
      fields.completedAt = fields.status === 'done' ? fields.updatedAt : null;
    }
    // 確かめた後に、ほかの人が変えたかもしれないので、UPDATE でも version を確かめる
    const task = await repo.update(current.id, fields, { expectedVersion: current.version });
    if (!task) throw new HttpError(412, 'ほかの人が先に変えました。読み直してください');
    res.set('ETag', etag(task)).json(task);
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    const current = await mustGet(req.params.id);
    mustMatch(req, current);
    if (!(await repo.remove(current.id, { expectedVersion: current.version }))) {
      throw new HttpError(412, 'ほかの人が先に変えました。読み直してください');
    }
    res.sendStatus(204);
  });

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
