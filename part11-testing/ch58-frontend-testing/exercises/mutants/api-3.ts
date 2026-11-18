// ミュータント: PATCH で、いつも done を true にする（完了を外せない）
import express from 'express';
import { createApiApp, listenFromEnv } from '../../samples/app/api-server.ts';

const app = express();
app.patch('/api/tasks/:id', express.json(), (req, _res, next) => {
  req.body = { done: true };
  next();
});
app.use(createApiApp({ allowReset: true }));
listenFromEnv(app);
