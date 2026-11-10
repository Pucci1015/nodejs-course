// 練習問題9の模範解答: ステータスコードと応答の形を直したもの
// 確かめ方（exercises の中で）: bash check-design.sh ../solutions/design-api.mjs
import express from 'express';
import { z } from 'zod';
import { createTasks } from '../samples/tasks-db.mjs';
import { HttpProblem, notFound, problemHandler } from './problem.mjs'; // 追加: 問題5で作ったもの

z.config(z.locales.ja());

const PORT = Number(process.env.PORT ?? 9329);
const tasks = createTasks(30);

const CreateTask = z.strictObject({
  title: z.string().trim().min(1, 'title を入力してください').max(100),
  dueDate: z.iso.date().optional(),
});
// 修正: 知らない項目（id・createdAt など）を黙って受け取らず、422 にする
const UpdateTask = z.strictObject({
  title: z.string().trim().min(1).max(100).optional(),
  status: z.enum(['todo', 'doing', 'done']).optional(),
  dueDate: z.iso.date().optional(),
});
// 追加: limit は 1〜100 の整数だけ（練習問題6と同じ考え方）
const Limit = z.string().regex(/^[1-9][0-9]{0,2}$/).transform(Number).pipe(z.number().max(100));

/** パスの :id を数にする。数字でなければ、そのタスクは無いので 404 */
function findTask(req) {
  const id = /^[1-9][0-9]{0,8}$/.test(req.params.id) ? Number(req.params.id) : NaN;
  const task = Number.isNaN(id) ? null : tasks.get(id);
  if (!task) throw new HttpProblem(404, { detail: `タスク ${req.params.id} はありません` });
  return task;
}

// 追加: ボディのあるリクエストは JSON だけ。ほかの形は 415（express.json は知らない形を読まずに飛ばすため）
function requireJson(req, res, next) {
  if (!req.is('application/json')) return next(new HttpProblem(415, { detail: 'Content-Type: application/json で送ってください' }));
  next();
}

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.get('/api/tasks', (req, res) => {
  // 修正: abc（NaN）や 1000 を、そのまま使わない
  const r = Limit.safeParse(req.query.limit ?? '20');
  if (!r.success) throw new HttpProblem(400, { errors: [{ parameter: 'limit', detail: 'limit は 1〜100 の整数です' }] });
  res.json({ items: tasks.all().slice(0, r.data) });
});

app.get('/api/tasks/:id', (req, res) => {
  res.json(findTask(req)); // 修正: 無いときに 200 の null を返さない
});

app.post('/api/tasks', requireJson, (req, res) => {
  const data = CreateTask.parse(req.body); // ZodError は problemHandler が 422 にする
  const task = tasks.create(data);
  // 修正: 作ったら 201 と、できたものの URL（Location）
  res.status(201).location(`/api/tasks/${task.id}`).json(task);
});

app.patch('/api/tasks/:id', requireJson, (req, res) => {
  const current = findTask(req);
  const data = UpdateTask.parse(req.body); // 修正: 中身の間違いは 400 ではなく 422
  res.json(tasks.update(current.id, data)); // 修正: 確かめた後の値（data）を使う。req.body をそのまま渡さない
});

app.delete('/api/tasks/:id', (req, res) => {
  const current = findTask(req); // 修正: 無いものは 404
  tasks.remove(current.id);
  res.status(204).end(); // 修正: 返す本文が無いので 204
});

app.use(notFound()); // 追加: どのルートにもないパスも problem+json の 404
app.use(problemHandler()); // 修正: problem+json にそろえ、500 では中の文を見せない

app.listen(PORT, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`);
});
