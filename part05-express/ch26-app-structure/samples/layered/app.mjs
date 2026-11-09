// アプリを組み立てる（第26章 4節）。使うもの（service）を受け取って、Express のアプリを返す。
// listen はしない。テストは createApp に偽物の service を渡して、listen(0) で動かせる
import express from 'express';
import { ZodError } from 'zod';
import { ConflictError, NotFoundError, ValidationError } from './errors.mjs';
import { createTasksRouter } from './routes/tasks-routes.mjs';

export function createApp({ service }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  app.use('/api/tasks', createTasksRouter({ service }));
  app.use((req, res) => res.status(404).json({ error: 'not_found' }));

  // サービスのエラー（仕事の言葉）を、HTTP のステータスに読み替えるのは、ここだけ
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof NotFoundError) return res.status(404).json({ error: 'not_found', detail: err.message });
    if (err instanceof ConflictError) return res.status(409).json({ error: 'conflict', detail: err.message });
    if (err instanceof ValidationError) return res.status(422).json({ error: 'invalid', field: err.field, detail: err.message });
    if (err instanceof ZodError) return res.status(422).json({ error: 'invalid', issues: err.issues.map((i) => i.path.join('.')) });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad_json' });
    console.error(err);
    res.status(500).json({ error: 'internal' });
  });
  return app;
}
