// 第31章 7節で書く、タスクを SQLite に保存する Express の API の完成形
// 使い方（~/dev/part06/ch31-node-db で）: node samples/server.mjs   （今いるフォルダに tasks.db を作る）
//   別のターミナルで: curl -i http://127.0.0.1:9427/api/tasks
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import { migrate } from './migrations.mjs';
import { createSqliteTaskRepo } from './task-repo.mjs';
import { statusForDbError } from './sqlite-errors.mjs';

const PORT = 9427;
const db = new DatabaseSync(process.env.TASKS_DB ?? 'tasks.db');
const { from, to } = migrate(db);
if (from !== to) console.log(`データベースを版 ${from} → ${to} にしました`);
const repo = createSqliteTaskRepo(db);

class HttpError extends Error {
  constructor(status, detail) {
    super(detail);
    this.status = status;
  }
}
const parseId = (s) => (/^[1-9]\d{0,8}$/.test(s) ? Number(s) : null);

// 型だけは、ここで確かめる。undefined やオブジェクトは ? にうまく渡せない（TypeError で 500 になるか、黙って NULL になる。2節）
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
  const now = new Date().toISOString();
  // 題名の長さや重なりは、ここでは確かめない。データベースの制約に任せ、エラーを 409・422 に読み替える
  const task = await repo.insert({ title, status: 'todo', dueDate, createdAt: now, updatedAt: now, completedAt: null, version: 1 });
  res.status(201).location(`/api/tasks/${task.id}`).json(task);
});

// 変えるときは、読んだときの version を送ってもらう（第30章 5節）
app.patch('/api/tasks/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const { version, title, status } = req.body ?? {};
  if (!Number.isInteger(version)) throw new HttpError(400, 'version（読んだときの版）を送ってください');
  const fields = { updatedAt: new Date().toISOString(), version: version + 1 };
  if (title !== undefined) fields.title = mustBeString(title, 'title');
  if (status !== undefined) {
    fields.status = mustBeString(status, 'status');
    fields.completedAt = status === 'done' ? fields.updatedAt : null;
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

// エラーを Problem Details にする。データベースの制約のエラーは 409・422 に読み替える
// データベースのエラーの文（表や列の名前が入っている）は、そのまま利用者に見せない
const DB_DETAIL = {
  409: 'ほかのデータとぶつかりました（同じ題名の、終わっていないタスクがあります）',
  422: '送られた値が決まりに合いません（題名は 1〜100 文字、status は todo・doing・done）',
};
app.use((err, req, res, next) => {
  const dbStatus = statusForDbError(err);
  const known = err instanceof HttpError || err.expose === true; // expose: express.json() の「JSON が壊れている」(400) など
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

// Ctrl+C で止めるときに、データベースを閉じる
process.on('SIGINT', () => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
});
