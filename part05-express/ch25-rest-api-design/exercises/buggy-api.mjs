// 練習問題5: ステータスコードと応答の形のバグを直す（9か所）
// 仕様は exercises/README.md の問題5です。確かめ方:
//   $ bash check-design.sh
// どのルートも「動く」のですが、HTTP の決まりごととしては、あちこち間違っています。
import express from 'express';
import { z } from 'zod';
import { createTasks } from '../samples/tasks-db.mjs';

z.config(z.locales.ja());

const PORT = Number(process.env.PORT ?? 9329);
const tasks = createTasks(30);

const CreateTask = z.object({
  title: z.string().trim().min(1, 'title を入力してください').max(100),
  dueDate: z.iso.date().optional(),
});
const UpdateTask = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  status: z.enum(['todo', 'doing', 'done']).optional(),
  dueDate: z.iso.date().optional(),
});

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.get('/api/tasks', (req, res) => {
  const limit = Number(req.query.limit ?? 20);
  res.json({ items: tasks.all().slice(0, limit) });
});

app.get('/api/tasks/:id', (req, res) => {
  res.json(tasks.get(Number(req.params.id)));
});

app.post('/api/tasks', (req, res) => {
  const data = CreateTask.parse(req.body);
  const task = tasks.create(data);
  res.json(task);
});

app.patch('/api/tasks/:id', (req, res) => {
  const r = UpdateTask.safeParse(req.body);
  if (!r.success) return res.status(400).json({ error: r.error.issues[0].message });
  const task = tasks.update(Number(req.params.id), req.body);
  if (!task) return res.status(404).json({ error: 'not found' });
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  tasks.remove(Number(req.params.id));
  res.json({ deleted: true });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`);
});
