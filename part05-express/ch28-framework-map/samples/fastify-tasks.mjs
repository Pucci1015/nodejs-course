// 同じタスク API を Fastify で（第28章 3節）
//   $ node samples/fastify-tasks.mjs          ← 127.0.0.1:9351
// Fastify は、ルートに JSON Schema を書くと、入力を確かめ、出力を速く JSON にしてくれる
import Fastify from 'fastify';
import { createTaskService, NotFoundError, parseId, problem, ValidationError } from './tasks-core.mjs';

const Task = {
  type: 'object',
  properties: { id: { type: 'integer' }, title: { type: 'string' }, done: { type: 'boolean' } },
  required: ['id', 'title', 'done'],
};

export function createApp(service = createTaskService()) {
  const app = Fastify({
    logger: false, // true にすると pino で JSON のログを書く（第26章 6節と同じ pino）
    // 既定（removeAdditional: true）では、additionalProperties: false の知らない項目を「黙って取り除く」。断るようにする
    ajv: { customOptions: { removeAdditional: false } },
  });
  app.removeContentTypeParser('text/plain'); // 既定では text/plain も読むので、JSON だけにする（ほかは 415）

  app.get('/tasks', { schema: { response: { 200: { type: 'object', properties: { items: { type: 'array', items: Task } } } } } }, async () => ({
    items: service.list(),
  }));

  app.get('/tasks/:id', { schema: { response: { 200: Task } } }, async (req) => {
    const id = parseId(req.params.id);
    if (id === null) throw new NotFoundError(`タスク ${req.params.id} はありません`);
    return service.get(id); // 返したものが JSON になる（res.json を呼ばない）
  });

  app.post(
    '/tasks',
    {
      schema: {
        // ボディの形を JSON Schema で書く。合わなければ、ハンドラは呼ばれずに 400（err.validation）
        body: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'], additionalProperties: false },
        response: { 201: Task },
      },
    },
    async (req, reply) => {
      const task = service.create(req.body);
      return reply.code(201).header('Location', `/tasks/${task.id}`).send(task);
    },
  );

  const send = (reply, req, status, detail) => reply.code(status).type('application/problem+json').send(JSON.stringify(problem(status, { detail, instance: req.url })));
  app.setNotFoundHandler((req, reply) => send(reply, req, 404));
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof NotFoundError) return send(reply, req, 404, err.message);
    // スキーマに合わない（err.validation）ものも、この API では 422 にそろえる
    if (err instanceof ValidationError || err.validation) return send(reply, req, 422, err.message);
    // Fastify 自身の 400 番台（壊れた JSON は 400、知らない Content-Type は 415）
    if (err.statusCode >= 400 && err.statusCode < 500) return send(reply, req, err.statusCode);
    send(reply, req, 500);
  });
  return app;
}

export async function listen(port = 0) {
  const app = createApp();
  const url = await app.listen({ port, host: '127.0.0.1' });
  return { url, close: () => app.close() };
}

if (import.meta.main) {
  const { url } = await listen(9351);
  console.log(`Fastify: ${url}/tasks（Ctrl+C で止める）`);
}
