// 練習問題8 の模範解答
import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import { z } from 'zod';
import type { TaskRepo } from './task-repo.ts';

z.config(z.locales.ja());

// ---- スキーマ ----
const Status = z.enum(['todo', 'doing', 'done']);
const Title = z.string().trim().min(1).max(100);
const DueDate = z.iso.date().nullable();
const digits = (min: number, max: number) => z.string().regex(/^[0-9]{1,5}$/).transform(Number).pipe(z.number().min(min).max(max));

const ListQuery = z.strictObject({
  status: Status.optional(),
  dueBefore: z.iso.date().optional(),
  limit: digits(1, 100).default(20),
  offset: digits(0, 10000).default(0),
});
const NewTask = z.strictObject({ title: Title, status: Status.optional(), dueDate: DueDate.optional() });
const TaskPatch = z
  .strictObject({ title: Title.optional(), status: Status.optional(), dueDate: DueDate.optional() })
  .refine((p) => Object.keys(p).length > 0, { error: '変える項目が1つもありません' });
const IdParam = z.string().regex(/^[1-9][0-9]{0,8}$/).transform(Number);
const IfMatch = z.string().regex(/^"[0-9]{1,9}"$/).transform((s) => Number(s.slice(1, -1)));

/** 外に出すタスクの形。知らない項目（データの層の都合の項目など）は取り除く */
const TaskOut = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(100),
  status: Status,
  dueDate: DueDate,
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
type TaskOut = z.output<typeof TaskOut>;

// ---- problem+json ----
type FieldError = { pointer: string; detail: string } | { parameter: string; detail: string };

export class HttpProblem extends Error {
  readonly status: number;
  readonly errors: FieldError[] | undefined;

  constructor(status: number, detail: string, errors?: FieldError[]) {
    super(detail);
    this.name = 'HttpProblem';
    this.status = status;
    this.errors = errors;
  }
}

const TITLES: Record<number, string> = {
  400: 'Bad Request',
  404: 'Not Found',
  412: 'Precondition Failed',
  422: 'Unprocessable Content',
  500: 'Internal Server Error',
};

const pointerOf = (path: readonly PropertyKey[]) => path.map((p) => `/${String(p)}`).join('');

/** ボディを確かめる。だめなら 422。知らない項目は、その項目の場所を指す */
function parseBody<S extends z.ZodType>(schema: S, body: unknown): z.output<S> {
  const r = schema.safeParse(body);
  if (r.success) return r.data;
  const errors = r.error.issues.flatMap((issue) =>
    issue.code === 'unrecognized_keys'
      ? issue.keys.map((key) => ({ pointer: pointerOf([...issue.path, key]), detail: '知らない項目です' }))
      : [{ pointer: pointerOf(issue.path), detail: issue.message }],
  );
  throw new HttpProblem(422, '入力が正しくありません', errors);
}

/** クエリを確かめる。だめなら 400。errors は parameter（名前）で指す */
function parseQuery<S extends z.ZodType>(schema: S, query: unknown): z.output<S> {
  const r = schema.safeParse(query);
  if (r.success) return r.data;
  const errors = r.error.issues.flatMap((issue) =>
    issue.code === 'unrecognized_keys'
      ? issue.keys.map((key) => ({ parameter: key, detail: '知らない名前です' }))
      : [{ parameter: issue.path.map(String).join('.'), detail: issue.message }],
  );
  throw new HttpProblem(400, 'クエリが正しくありません', errors);
}

function parseId(text: string): number {
  const r = IdParam.safeParse(text);
  if (!r.success) throw new HttpProblem(404, 'タスクが見つかりません');
  return r.data;
}

/** 外に出す前に確かめる。データの層が変な値を返したら、それはこちらのバグなので 500（パースの失敗をそのまま投げる） */
const out = (value: unknown): TaskOut => TaskOut.parse(value);
const etag = (t: TaskOut) => `"${t.version}"`;

export function createApp(repo: TaskRepo): express.Express {
  const app = express();
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/tasks', async (req: Request, res: Response<TaskOut[]>) => {
    const { limit, offset, ...filter } = parseQuery(ListQuery, req.query);
    const tasks = await repo.list(filter);
    res.json(tasks.slice(offset, offset + limit).map(out));
  });

  app.get('/api/tasks/:id', async (req: Request<{ id: string }>, res: Response<TaskOut>) => {
    const found = await repo.get(parseId(req.params.id));
    if (found === null) throw new HttpProblem(404, 'タスクが見つかりません');
    const task = out(found);
    res.set('ETag', etag(task)).json(task);
  });

  app.post('/api/tasks', async (req: Request, res: Response<TaskOut>) => {
    const input = parseBody(NewTask, req.body);
    const task = out(await repo.create(input));
    res.status(201).location(`/api/tasks/${task.id}`).set('ETag', etag(task)).json(task);
  });

  app.patch('/api/tasks/:id', async (req: Request<{ id: string }>, res: Response<TaskOut>) => {
    const id = parseId(req.params.id);
    const header = req.get('if-match');
    let expectedVersion: number | undefined;
    if (header !== undefined) {
      const r = IfMatch.safeParse(header);
      if (!r.success) throw new HttpProblem(412, 'If-Match の形が正しくありません');
      expectedVersion = r.data;
    }
    const patch = parseBody(TaskPatch, req.body);
    const updated = await repo.update(id, patch, expectedVersion === undefined ? {} : { expectedVersion });
    if (updated === null) {
      if ((await repo.get(id)) === null) throw new HttpProblem(404, 'タスクが見つかりません');
      throw new HttpProblem(412, 'ほかの人が先に変えました。読み直してください');
    }
    const task = out(updated);
    res.set('ETag', etag(task)).json(task);
  });

  app.delete('/api/tasks/:id', async (req: Request<{ id: string }>, res) => {
    if (!(await repo.remove(parseId(req.params.id)))) throw new HttpProblem(404, 'タスクが見つかりません');
    res.status(204).end();
  });

  app.use(() => {
    throw new HttpProblem(404, 'そのURLはありません');
  });

  const problemHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
    let problem: HttpProblem;
    if (err instanceof HttpProblem) problem = err;
    else if (err instanceof SyntaxError && 'status' in err && err.status === 400) problem = new HttpProblem(400, 'JSON として読めません');
    else {
      console.error(err); // TaskOut.parse の失敗（ZodError）もここ。中身はログにだけ書く
      problem = new HttpProblem(500, 'サーバでエラーが起きました');
    }
    res
      .status(problem.status)
      .type('application/problem+json')
      .json({
        type: 'about:blank',
        title: TITLES[problem.status] ?? 'Error',
        status: problem.status,
        detail: problem.message,
        ...(problem.errors === undefined ? {} : { errors: problem.errors }),
      });
  };
  app.use(problemHandler);
  return app;
}
