// ミュータント: DELETE に 204 を返すが、消さない
import express from 'express';
import { createApiApp, listenFromEnv } from '../../samples/app/api-server.ts';

const app = express();
app.delete('/api/tasks/:id', (_req, res) => {
  res.status(204).end();
});
app.use(createApiApp({ allowReset: true }));
listenFromEnv(app);
