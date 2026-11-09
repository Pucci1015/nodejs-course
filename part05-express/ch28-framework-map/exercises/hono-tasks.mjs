// 練習問題3: Hono のタスク API に、PATCH と DELETE を足す
// 要件は exercises/README.md の問題3です。確かめ方:
//   $ node --test hono-tasks.test.mjs
//   $ node hono-tasks.mjs            ← 127.0.0.1:9354 で動かして、curl でも試せる
// ここまでは、サンプルの samples/hono-tasks.mjs と同じです。
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
  app.post('/tasks', async (c) => {
    if (!isJson(c.req.header('content-type'))) return send(c, 415);
    let body;
    try {
      body = await c.req.json(); // ボディは、読むときに初めて読む（ミドルウェアは要らない）
    } catch {
      return send(c, 400);
    }
    const task = service.create(body);
    return c.json(task, 201, { Location: `/tasks/${task.id}` });
  });

  // ここを書く: PATCH /tasks/:id と DELETE /tasks/:id（service.update・service.remove を使う）

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
