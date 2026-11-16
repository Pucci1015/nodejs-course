// 5.1節: Express に型を付ける
import crypto from 'node:crypto';
import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import type { Status, Task, TaskRepo } from './task.ts';

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

const STATUSES: readonly string[] = ['todo', 'doing', 'done'];
function isStatus(value: unknown): value is Status {
  return typeof value === 'string' && STATUSES.includes(value);
}

/** パスの id を数にする。形が違えば 404 */
function parseId(text: string): number {
  if (!/^[1-9]\d{0,8}$/.test(text)) throw new HttpError(404, 'タスクが見つかりません');
  return Number(text);
}

export function createApp(repo: TaskRepo): express.Express {
  const app = express();
  app.use(express.json());

  // req.id は express.d.ts で足した項目
  app.use((req, res, next) => {
    req.id = crypto.randomUUID();
    res.set('X-Request-Id', req.id);
    next();
  });

  // Request<パスの引数, 応答のボディ, リクエストのボディ, クエリ>
  app.get('/api/tasks', async (req: Request<object, Task[]>, res: Response<Task[]>) => {
    const status = req.query.status;
    if (status !== undefined && !isStatus(status)) throw new HttpError(400, 'status は todo・doing・done のどれかです');
    res.json(await repo.list(status === undefined ? {} : { status }));
  });

  app.get('/api/tasks/:id', async (req: Request<{ id: string }>, res: Response<Task>) => {
    const task = await repo.get(parseId(req.params.id));
    if (task === null) throw new HttpError(404, 'タスクが見つかりません');
    res.json(task);
  });

  app.post('/api/tasks', async (req, res: Response<Task>) => {
    // req.body は any。unknown として受け取って、確かめてから使う（第38章で Zod に替える）
    const body: unknown = req.body;
    if (typeof body !== 'object' || body === null || !('title' in body) || typeof body.title !== 'string' || body.title.trim() === '') {
      throw new HttpError(422, 'title（空でない文字列）が要ります');
    }
    const task = await repo.create({ title: body.title.trim() });
    res.status(201).location(`/api/tasks/${task.id}`).json(task);
  });

  app.delete('/api/tasks/:id', async (req: Request<{ id: string }>, res) => {
    if (!(await repo.remove(parseId(req.params.id)))) throw new HttpError(404, 'タスクが見つかりません');
    res.status(204).end();
  });

  // エラーのミドルウェアの型。err は unknown
  const onError: ErrorRequestHandler = (err: unknown, req, res, _next) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message, requestId: req.id });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'サーバのエラーです', requestId: req.id });
  };
  app.use(onError);
  return app;
}
