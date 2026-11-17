// 第55章 練習問題5: 認可の漏れを直す（本文7節）
// このアプリには、ほかの人のタスクを書き換えたり、消したり、ほかの人のタスクとして作ったりできる漏れがある
import express from 'express';
import session from 'express-session';
import { z } from 'zod';

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

export type Task = { id: number; ownerId: number; title: string; done: boolean };

const CreateTask = z.object({ title: z.string().min(1).max(100), ownerId: z.number().int().optional() });
const UpdateTask = z.object({ title: z.string().min(1).max(100).optional(), done: z.boolean().optional() });

export function createOwnerApp(initialTasks: Task[]) {
  const users = new Map([
    ['alice', 1],
    ['bob', 2],
  ]);
  const tasks = initialTasks.map((t) => ({ ...t }));
  let nextId = Math.max(0, ...tasks.map((t) => t.id)) + 1;

  const app = express();
  app.use(express.json());
  app.use(session({ name: 'sid', secret: 'dev-only-session-secret-change-me', resave: false, saveUninitialized: false }));

  app.post('/login', (req, res) => {
    const name: unknown = (req.body as { name?: unknown }).name;
    const userId = typeof name === 'string' ? users.get(name) : undefined;
    if (userId === undefined) return res.status(401).json({ detail: 'ログインできません' });
    req.session.regenerate(() => {
      req.session.userId = userId;
      res.status(204).end();
    });
  });

  app.use('/api', (req, res, next) => {
    if (req.session.userId === undefined) return res.status(401).json({ detail: 'ログインしてください' });
    next();
  });

  app.get('/api/tasks', (req, res) => {
    res.json(tasks.filter((t) => t.ownerId === req.session.userId));
  });

  app.post('/api/tasks', (req, res) => {
    const input = CreateTask.parse(req.body);
    const task: Task = { id: nextId++, ownerId: input.ownerId ?? req.session.userId ?? 0, title: input.title, done: false };
    tasks.push(task);
    res.status(201).json(task);
  });

  app.get('/api/tasks/:id', (req, res) => {
    const task = tasks.find((t) => t.id === Number(req.params.id) && t.ownerId === req.session.userId);
    if (task === undefined) return res.status(404).json({ detail: 'タスクがありません' });
    res.json(task);
  });

  app.patch('/api/tasks/:id', (req, res) => {
    const task = tasks.find((t) => t.id === Number(req.params.id));
    if (task === undefined) return res.status(404).json({ detail: 'タスクがありません' });
    if (task.ownerId !== req.session.userId) return res.status(403).json({ detail: '自分のタスクではありません' });
    Object.assign(task, UpdateTask.parse(req.body));
    res.json(task);
  });

  app.delete('/api/tasks/:id', (req, res) => {
    const index = tasks.findIndex((t) => t.id === Number(req.params.id));
    if (index === -1) return res.status(404).json({ detail: 'タスクがありません' });
    tasks.splice(index, 1);
    res.status(204).end();
  });

  // 入力の形が違えば 422
  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof z.ZodError) return res.status(422).json({ detail: '入力が正しくありません' });
    next(err);
  });

  return app;
}
