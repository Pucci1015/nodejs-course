// ルートの層: HTTP とサービスをつなぐ（第26章 3節）
// することは「リクエストを読んで確かめる → サービスを呼ぶ → 応答の形にする」だけ。決まりは書かない
import express from 'express';
import { z } from 'zod';

const Id = z.string().regex(/^[1-9][0-9]{0,8}$/).transform(Number);
const CreateBody = z.strictObject({
  title: z.string().min(1).max(100),
  dueDate: z.iso.date().optional(),
});

/** @param {{ service: ReturnType<import('../services/task-service.mjs').createTaskService> }} deps */
export function createTasksRouter({ service }) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    res.json({ items: await service.list() });
  });

  router.get('/:id', async (req, res) => {
    const id = Id.safeParse(req.params.id);
    if (!id.success) return res.status(404).json({ error: 'not_found' });
    res.json(await service.get(id.data)); // NotFoundError は app.mjs のエラーハンドラが 404 にする
  });

  router.post('/', async (req, res) => {
    const body = CreateBody.parse(req.body); // 形の間違い（ZodError）は 422
    const task = await service.create(body);
    res.status(201).location(`${req.baseUrl}/${task.id}`).json(task);
  });

  return router;
}
