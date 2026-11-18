// ミュータント: PATCH（完了の切り替え）に、それらしい応答を返すが、保存しない
import express from 'express';
import { createApiApp, listenFromEnv } from '../../samples/app/api-server.ts';

const app = express();
app.patch('/api/tasks/:id', (req, res) => {
  res.json({ id: Number(req.params.id), title: '', done: true });
});
app.use(createApiApp({ allowReset: true }));
listenFromEnv(app);
