// 練習問題5の模範解答: Hono のタスク API に、PATCH と DELETE を足したもの
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { createTaskService, isJson, NotFoundError, parseId, problem, ValidationError } from '../samples/tasks-core.mjs';

export function createApp(service = createTaskService()) {
  const app = new Hono();
  const send = (c, status, detail) => c.body(JSON.stringify(problem(status, { detail, instance: c.req.path })), status, { 'Content-Type': 'application/problem+json' });

  app.get('/tasks', (c) => c.json({ items: service.list() }));
  app.get('/tasks/:id', (c) => {
    const id = parseId(c.req.param('id'));
    if (id === null) throw new NotFoundError(`タスク ${c.req.param('id')} はありません`);
    return c.json(service.get(id));
  });
  /** JSON のボディを読む。読めなければ、返す Response（415・400）を返す */
  async function readJson(c) {
    if (!isJson(c.req.header('content-type'))) return send(c, 415);
    try {
      return await c.req.json();
    } catch {
      return send(c, 400);
    }
  }

  app.post('/tasks', async (c) => {
    const body = await readJson(c);
    if (body instanceof Response) return body;
    const task = service.create(body);
    return c.json(task, 201, { Location: `/tasks/${task.id}` });
  });

  // 追加: 1件を変える。ボディの読み方は POST と同じなので、関数に出した
  app.patch('/tasks/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    if (id === null) throw new NotFoundError(`タスク ${c.req.param('id')} はありません`);
    const body = await readJson(c);
    if (body instanceof Response) return body;
    return c.json(service.update(id, body));
  });

  // 追加: 1件を消す。本文が無いので 204（c.body(null, 204)）
  app.delete('/tasks/:id', (c) => {
    const id = parseId(c.req.param('id'));
    if (id === null) throw new NotFoundError(`タスク ${c.req.param('id')} はありません`);
    service.remove(id);
    return c.body(null, 204);
  });

  app.notFound((c) => send(c, 404));
  app.onError((err, c) => {
    if (err instanceof NotFoundError) return send(c, 404, err.message);
    if (err instanceof ValidationError) return send(c, 422, err.message);
    return send(c, 500);
  });
  return app;
}

export async function listen(port = 0) {
  const app = createApp();
  const server = await new Promise((resolve) => {
    const s = serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, () => resolve(s));
  });
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
}

if (import.meta.main) {
  const { url } = await listen(9354);
  console.log(`Hono: ${url}/tasks（Ctrl+C で止める）`);
}
