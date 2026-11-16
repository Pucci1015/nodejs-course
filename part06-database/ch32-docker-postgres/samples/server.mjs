// 第32章 8.3節で書く、タスクを PostgreSQL に保存する Express の API の完成形
// 第31章の server.mjs から、データベースの所（プール・マイグレーション・リポジトリ・エラーの読み替え）だけを取り替えた
// 使い方（~/dev/part06/ch32-docker-postgres で）: node samples/server.mjs
//   別のターミナルで: curl -i http://127.0.0.1:9437/api/tasks
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { createPool } from './db.mjs';
import { migrate } from './migrate.mjs';
import { createPgTaskRepo } from './pg-task-repo.mjs';
import { statusForPgError } from './pg-errors.mjs';

const PORT = 9437;
const pool = createPool({ max: 10 });
const applied = await migrate(pool, path.join(import.meta.dirname, 'migrations'));
if (applied.length > 0) console.log(`マイグレーションを動かしました: ${applied.join(', ')}`);
const repo = createPgTaskRepo(pool);

class HttpError extends Error {
  constructor(status, detail) {
    super(detail);
    this.status = status;
  }
}
const parseId = (s) => (/^[1-9]\d{0,8}$/.test(s) ? Number(s) : null);

function mustBeString(value, name, { nullable = false } = {}) {
  if (typeof value === 'string' || (nullable && value === null)) return value;
  throw new HttpError(422, `${name} は文字列で送ってください`);
}

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.get('/api/tasks', async (req, res) => {
  res.json(await repo.list());
});

app.get('/api/tasks/:id', async (req, res) => {
  const task = await repo.get(parseId(req.params.id));
  if (!task) throw new HttpError(404, `タスク ${req.params.id} はありません`);
  res.json(task);
});

app.post('/api/tasks', async (req, res) => {
  const title = mustBeString(req.body?.title, 'title');
  const dueDate = mustBeString(req.body?.dueDate ?? null, 'dueDate', { nullable: true });
  // created_at・updated_at・status・version は、テーブルの DEFAULT に任せる
  const task = await repo.insert({ title, dueDate });
  res.status(201).location(`/api/tasks/${task.id}`).json(task);
});

app.patch('/api/tasks/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const { version, title, status } = req.body ?? {};
  if (!Number.isInteger(version)) throw new HttpError(400, 'version（読んだときの版）を送ってください');
  const now = new Date();
  const fields = { updatedAt: now, version: version + 1 }; // pg は Date を timestamptz として渡せる
  if (title !== undefined) fields.title = mustBeString(title, 'title');
  if (status !== undefined) {
    fields.status = mustBeString(status, 'status');
    fields.completedAt = status === 'done' ? now : null;
  }
  const task = await repo.update(id, fields, { expectedVersion: version });
  if (task) return res.json(task);
  if (!(await repo.get(id))) throw new HttpError(404, `タスク ${req.params.id} はありません`);
  throw new HttpError(409, 'ほかの人が先に変えました。読み直してください');
});

app.delete('/api/tasks/:id', async (req, res) => {
  if (!(await repo.remove(parseId(req.params.id)))) throw new HttpError(404, `タスク ${req.params.id} はありません`);
  res.sendStatus(204);
});

const DB_DETAIL = {
  409: 'ほかのデータとぶつかりました（同じ題名の、終わっていないタスクがあります）',
  422: '送られた値が決まりに合いません（題名は 1〜100 文字、status は todo・doing・done、dueDate は YYYY-MM-DD）',
};
app.use((err, req, res, next) => {
  const dbStatus = statusForPgError(err);
  const known = err instanceof HttpError || err.expose === true;
  const status = known ? err.status : (dbStatus ?? 500);
  if (status === 500) console.error(err);
  res.status(status).type('application/problem+json').json({
    type: 'about:blank',
    title: http.STATUS_CODES[status],
    status,
    detail: known ? err.message : (DB_DETAIL[dbStatus] ?? 'サーバの中でエラーが起きました'),
  });
});

const server = app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/api/tasks で待っています（Ctrl+C で止める）`));

// Ctrl+C で止めるときに、受け付けをやめ、プールの接続を全部閉じてから終わる
process.on('SIGINT', () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
});
