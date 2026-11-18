// 第58章: 練習用のタスクの API（メモリに保存）。画面と E2E のテストの相手
// 動かし方（samples/app をコピーした web/ で）: node api-server.ts   → http://127.0.0.1:9727
// 環境変数: API_PORT（待つ番号）、API_DELAY_MS（応答を遅らせるミリ秒）、TEST_RESET=1（テスト用の /api/test/reset を開ける）
// 中身は読まなくてよい（第5部と同じ書き方）
import express from 'express';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';

export interface Task {
  id: number;
  title: string;
  done: boolean;
}

/** 起動したとき（と、/api/test/reset の後）のタスク */
export const SEED: readonly Task[] = [
  { id: 1, title: '牛乳を買う', done: false },
  { id: 2, title: '第58章を読む', done: true },
];

const CreateBody = z.object({ title: z.string().trim().min(1, '題名を入れてください').max(100, '題名は 100 文字までです') });
const PatchBody = z.object({ done: z.boolean() });

export interface ApiOptions {
  delayMs?: number;
  allowReset?: boolean;
}

export function createApiApp({ delayMs = 0, allowReset = false }: ApiOptions = {}): Express {
  let tasks: Task[] = [];
  let nextId = 1;
  function reset() {
    tasks = SEED.map((t) => ({ ...t }));
    nextId = Math.max(0, ...tasks.map((t) => t.id)) + 1;
  }
  reset();

  function problem(res: Response, status: number, title: string, errors?: { pointer: string; detail: string }[]) {
    res.status(status).type('application/problem+json').json({ title, status, ...(errors ? { errors } : {}) });
  }
  function findTask(req: Request, res: Response): Task | undefined {
    const task = tasks.find((t) => String(t.id) === req.params.id);
    if (!task) problem(res, 404, 'タスクが見つかりません');
    return task;
  }

  const app = express();
  app.use(express.json());
  // 遅いネットワークのまねをする（不安定なテストを見つけるため。本文7節）
  app.use((_req, _res, next) => {
    if (delayMs > 0) setTimeout(next, delayMs);
    else next();
  });

  app.get('/api/tasks', (_req, res) => {
    res.json({ items: tasks });
  });
  app.post('/api/tasks', (req, res) => {
    const parsed = CreateBody.safeParse(req.body);
    if (!parsed.success) {
      const detail = parsed.error.issues[0]?.message ?? '入力が正しくありません';
      return problem(res, 422, '入力が正しくありません', [{ pointer: '/title', detail }]);
    }
    const task = { id: nextId++, title: parsed.data.title, done: false };
    tasks.push(task);
    res.status(201).location(`/api/tasks/${task.id}`).json(task);
  });
  app.patch('/api/tasks/:id', (req, res) => {
    const task = findTask(req, res);
    if (!task) return;
    const parsed = PatchBody.safeParse(req.body);
    if (!parsed.success) return problem(res, 422, '入力が正しくありません', [{ pointer: '/done', detail: 'true か false にしてください' }]);
    task.done = parsed.data.done;
    res.json(task);
  });
  app.delete('/api/tasks/:id', (req, res) => {
    const task = findTask(req, res);
    if (!task) return;
    tasks = tasks.filter((t) => t !== task);
    res.status(204).end();
  });
  // テストのためだけの入り口: データを最初の状態に戻す。TEST_RESET=1 のときだけ開ける（本番では作らない。本文8.3節）
  if (allowReset) {
    app.post('/api/test/reset', (_req, res) => {
      reset();
      res.status(204).end();
    });
  }
  return app;
}

/** 環境変数を読んで起動する（このファイルと、練習問題7のミュータントが使う） */
export function listenFromEnv(app: Express): void {
  const port = Number(process.env.API_PORT ?? 9727);
  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`http://127.0.0.1:${port}/api/tasks で待っています`);
  });
  process.on('SIGINT', () => server.close());
  process.on('SIGTERM', () => server.close());
}

if (import.meta.main) {
  listenFromEnv(createApiApp({ delayMs: Number(process.env.API_DELAY_MS ?? 0), allowReset: process.env.TEST_RESET === '1' }));
}
