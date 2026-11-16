// 4節: Express の境界で Zod を使う。確かめた後の値には、スキーマから作った型が付く
import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import { z } from 'zod';

z.config(z.locales.ja());

// ---- スキーマと型（1か所に書く） ----
const Status = z.enum(['todo', 'doing', 'done']);
const NewTask = z.strictObject({
  title: z.string().trim().min(1).max(100),
  status: Status.default('todo'),
});
const ListQuery = z.strictObject({
  status: Status.optional(),
  // クエリは文字列で届く。数字だけの文字列か確かめてから数にする（第5部 第25章 5.2節）
  limit: z.string().regex(/^[0-9]{1,3}$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(20),
});
const IdParams = z.object({ id: z.string().regex(/^[1-9][0-9]{0,8}$/).transform(Number) });

type Task = { id: number; title: string; status: z.infer<typeof Status>; createdAt: string };

// ---- problem+json のエラー（第5部 第25章） ----
type FieldError = { pointer: string; detail: string };
const TITLES: Record<number, string> = { 400: 'Bad Request', 404: 'Not Found', 422: 'Unprocessable Content', 500: 'Internal Server Error' };

class HttpProblem extends Error {
  readonly status: number;
  readonly errors: FieldError[] | undefined;
  constructor(status: number, detail: string, errors?: FieldError[]) {
    super(detail);
    this.status = status;
    this.errors = errors;
  }
}

/** schema で value を確かめる。だめなら status の HttpProblem を投げる。通れば、確かめた後の型の値を返す */
function parse<S extends z.ZodType>(schema: S, value: unknown, status: number): z.output<S> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const errors = result.error.issues.map((issue) => ({
    pointer: issue.path.map((p) => `/${String(p)}`).join(''),
    detail: issue.message,
  }));
  throw new HttpProblem(status, '入力が正しくありません', errors);
}

// ---- アプリ ----
export function createApp(): express.Express {
  const app = express();
  app.use(express.json());
  const tasks: Task[] = [];
  let nextId = 1;

  app.get('/api/tasks', (req: Request, res: Response<Task[]>) => {
    const query = parse(ListQuery, req.query, 400); // { status?: 'todo' | 'doing' | 'done'; limit: number }
    const found = tasks.filter((t) => query.status === undefined || t.status === query.status);
    res.json(found.slice(0, query.limit));
  });

  app.get('/api/tasks/:id', (req: Request, res: Response<Task>) => {
    const params = IdParams.safeParse(req.params); // 形が違う id は「無い」と同じ 404 にする
    if (!params.success) throw new HttpProblem(404, 'タスクが見つかりません');
    const task = tasks.find((t) => t.id === params.data.id); // params.data.id: number
    if (task === undefined) throw new HttpProblem(404, 'タスクが見つかりません');
    res.json(task);
  });

  app.post('/api/tasks', (req: Request, res: Response<Task>) => {
    const input = parse(NewTask, req.body, 422); // req.body は any。input は { title: string; status: … }
    const task: Task = { id: nextId++, ...input, createdAt: new Date().toISOString() };
    tasks.push(task);
    res.status(201).location(`/api/tasks/${task.id}`).json(task);
  });

  const onError: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
    let problem: HttpProblem;
    if (err instanceof HttpProblem) problem = err;
    else if (err instanceof SyntaxError && 'status' in err && err.status === 400) problem = new HttpProblem(400, 'JSON として読めません');
    else problem = new HttpProblem(500, 'サーバでエラーが起きました');
    if (problem.status === 500) console.error(err);
    res
      .status(problem.status)
      .type('application/problem+json')
      .json({ type: 'about:blank', title: TITLES[problem.status], status: problem.status, detail: problem.message, errors: problem.errors });
  };
  app.use(onError);
  return app;
}

if (import.meta.main) {
  const port = 9480;
  createApp().listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/api/tasks で待っています`));
}
