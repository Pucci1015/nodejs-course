// 同じタスク API を Express で（第28章 2節。比べるための元）
//   $ node samples/express-tasks.mjs          ← 127.0.0.1:9350
import express from 'express';
import { createTaskService, isJson, NotFoundError, parseId, problem, ValidationError } from './tasks-core.mjs';

const sendProblem = (res, status, req, detail) =>
  res.status(status).type('application/problem+json').send(JSON.stringify(problem(status, { detail, instance: req.originalUrl })));

export function createApp(service = createTaskService()) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  app.get('/tasks', (req, res) => res.json({ items: service.list() }));
  app.get('/tasks/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) throw new NotFoundError(`タスク ${req.params.id} はありません`);
    res.json(service.get(id));
  });
  app.post('/tasks', (req, res) => {
    if (!isJson(req.get('content-type'))) return sendProblem(res, 415, req);
    const task = service.create(req.body);
    res.status(201).location(`/tasks/${task.id}`).json(task);
  });

  app.use((req, res) => sendProblem(res, 404, req));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof NotFoundError) return sendProblem(res, 404, req, err.message);
    if (err instanceof ValidationError) return sendProblem(res, 422, req, err.message);
    if (err.type === 'entity.parse.failed') return sendProblem(res, 400, req);
    sendProblem(res, 500, req);
  });
  return app;
}

/** テストから使う: 起動して { url, close } を返す */
export async function listen(port = 0) {
  const server = createApp().listen(port, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
}

if (import.meta.main) {
  const { url } = await listen(9350);
  console.log(`Express: ${url}/tasks（Ctrl+C で止める）`);
}
