// 練習問題8の模範解答: ルートの層。HTTP を読んで確かめ、サービスを呼び、応答の形にする
import express from 'express';
import { z } from 'zod';
import { HttpProblem } from '../../lib/problem.mjs';
import { ConflictError, NotFoundError, ValidationError } from './errors.mjs';

z.config(z.locales.ja());

const Id = z.string().regex(/^[1-9][0-9]{0,8}$/).transform(Number);
const ListQuery = z.strictObject({ status: z.enum(['todo', 'doing', 'done']).optional() });
// ここで確かめるのは「形」（型・知らない項目）だけ。長さや締め切りなどの決まりは、サービスが確かめる
const CreateBody = z.strictObject({
  title: z.string(),
  dueDate: z.string().nullable().optional(),
});
const UpdateBody = z.strictObject({
  title: z.string().optional(),
  status: z.string().optional(),
  dueDate: z.string().nullable().optional(),
});

/** パスの id を数にする。形が違えば、そのタスクは無い（404）。サービスは呼ばない */
function parseId(req) {
  const r = Id.safeParse(req.params.id);
  if (!r.success) throw new HttpProblem(404, { detail: `タスク ${req.params.id} はありません` });
  return r.data;
}

/** JSON のボディだけを受け付ける */
function requireJson(req, res, next) {
  if (!req.is('application/json')) return next(new HttpProblem(415, { detail: 'Content-Type: application/json で送ってください' }));
  next();
}

/** @param {{ service: ReturnType<import('./task-service.mjs').createTaskService> }} deps */
export function createTasksRouter({ service }) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const q = ListQuery.safeParse(req.query);
    if (!q.success) {
      throw new HttpProblem(400, { errors: q.error.issues.map((i) => ({ parameter: String(i.path[0] ?? i.keys?.[0] ?? ''), detail: i.message })) });
    }
    res.json({ items: await service.list(q.data) });
  });

  router.get('/:id', async (req, res) => {
    res.json(await service.get(parseId(req)));
  });

  router.post('/', requireJson, async (req, res) => {
    const body = CreateBody.parse(req.body); // ZodError は problemHandler が 422 にする
    const task = await service.create(body);
    res.status(201).location(`${req.baseUrl}/${task.id}`).json(task);
  });

  router.patch('/:id', requireJson, async (req, res) => {
    const id = parseId(req);
    const body = UpdateBody.parse(req.body);
    res.json(await service.update(id, body));
  });

  router.delete('/:id', async (req, res) => {
    await service.remove(parseId(req));
    res.sendStatus(204);
  });

  return router;
}

/**
 * サービスのエラー（仕事の言葉）を、HTTP の言葉（HttpProblem）に読み替えるエラーハンドラ。
 * problemHandler の前に置く。知らないエラーは、そのまま次へ
 */
export function mapDomainErrors() {
  return (err, req, res, next) => {
    if (err instanceof NotFoundError) return next(new HttpProblem(404, { detail: err.message }));
    if (err instanceof ConflictError) return next(new HttpProblem(409, { detail: err.message }));
    if (err instanceof ValidationError) {
      const errors = [{ ...(err.field ? { pointer: `#/${err.field}` } : {}), detail: err.message }];
      return next(new HttpProblem(422, { errors }));
    }
    next(err);
  };
}
