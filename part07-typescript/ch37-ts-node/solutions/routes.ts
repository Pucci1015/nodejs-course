// 練習問題3 の模範解答
import express, { type Request, type Response } from 'express';
import type { Status, Task, TaskRepo } from './task-repo.ts';

type ErrorBody = { error: string };

function isStatus(value: unknown): value is Status {
  return value === 'todo' || value === 'doing' || value === 'done';
}

/** パスの id。1 以上の整数の形（先頭の 0 は不可）でなければ null */
function parseId(text: string): number | null {
  return /^[1-9]\d{0,8}$/.test(text) ? Number(text) : null;
}

export function createTaskRouter(repo: TaskRepo): express.Router {
  const router = express.Router();

  router.get('/', async (req: Request, res: Response<Task[] | ErrorBody>) => {
    // req.query.status は string | ParsedQs | (string | ParsedQs)[] | undefined。?status=a&status=b なら配列
    const status = req.query.status;
    if (status === undefined) {
      res.json(await repo.list());
      return;
    }
    if (!isStatus(status)) {
      res.status(400).json({ error: 'status は todo・doing・done のどれかです' });
      return;
    }
    res.json(await repo.list({ status }));
  });

  router.get('/:id', async (req: Request<{ id: string }>, res: Response<Task | ErrorBody>) => {
    const id = parseId(req.params.id);
    const found = id === null ? null : await repo.get(id);
    if (found === null) {
      res.status(404).json({ error: 'タスクが見つかりません' });
      return;
    }
    res.json(found);
  });

  router.delete('/:id', async (req: Request<{ id: string }>, res: Response<ErrorBody>) => {
    const id = parseId(req.params.id);
    if (id === null || !(await repo.remove(id))) {
      res.status(404).json({ error: 'タスクが見つかりません' });
      return;
    }
    res.status(204).end();
  });

  return router;
}
