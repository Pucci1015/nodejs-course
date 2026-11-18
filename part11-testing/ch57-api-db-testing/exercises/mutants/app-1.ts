// ミュータント: DELETE が 204 ではなく、200 と JSON を返す
import express, { type ErrorRequestHandler, type Response } from 'express';
import { z } from 'zod';
import type { TaskService } from '../service.ts';
import { ConflictError, ValidationError } from '../types.ts';

const CreateBody = z.object({
  title: z.string(),
  dueDate: z.iso.date().nullable().optional(),
});
const StatusBody = z.object({ status: z.enum(['todo', 'doing', 'done']) });

function problem(res: Response, status: number, title: string, extra: Record<string, unknown> = {}) {
  res.status(status).type('application/problem+json').json({ title, status, ...extra });
}

/** :id が正の整数でなければ undefined */
function parseId(value: string): number | undefined {
  return /^[1-9]\d{0,9}$/.test(value) ? Number(value) : undefined;
}

export function createApp({ service }: { service: TaskService }) {
  const app = express();
  app.use(express.json());

  app.get('/api/tasks', async (_req, res) => {
    res.json({ items: await service.list() });
  });

  app.post('/api/tasks', async (req, res) => {
    const body = CreateBody.parse(req.body);
    const task = await service.create(body);
    res.status(201).location(`/api/tasks/${task.id}`).json(task);
  });

  app.get('/api/tasks/:id', async (req, res) => {
    const id = parseId(req.params.id);
    const task = id === undefined ? undefined : await service.get(id);
    if (task === undefined) return problem(res, 404, 'タスクが見つかりません');
    res.json(task);
  });

  app.put('/api/tasks/:id/status', async (req, res) => {
    const id = parseId(req.params.id);
    const { status } = StatusBody.parse(req.body);
    const task = id === undefined ? undefined : await service.changeStatus(id, status);
    if (task === undefined) return problem(res, 404, 'タスクが見つかりません');
    res.json(task);
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    const id = parseId(req.params.id);
    const removed = id === undefined ? false : await service.remove(id);
    if (!removed) return problem(res, 404, 'タスクが見つかりません');
    res.json({ deleted: true });
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof z.ZodError) {
      // 第5部 第25章: どの項目かを JSON Pointer で
      const errors = err.issues.map((issue) => ({ pointer: `/${issue.path.join('/')}`, detail: issue.message }));
      return problem(res, 422, '入力が正しくありません', { errors });
    }
    if (err instanceof ValidationError) {
      return problem(res, 422, '入力が正しくありません', { errors: [{ pointer: err.pointer, detail: err.message }] });
    }
    if (err instanceof ConflictError) return problem(res, 409, err.message);
    if (err instanceof SyntaxError) return problem(res, 400, 'JSON として読めません');
    console.error(err);
    problem(res, 500, 'サーバの中で問題が起きました');
  };
  app.use(onError);
  return app;
}
