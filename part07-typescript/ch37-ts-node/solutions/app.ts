// 練習問題8 の模範解答
import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import type { NewTask, Status, Task, TaskFilter, TaskPatch, TaskRepo } from './task-repo.ts';

type FieldError = { field: string; message: string };

/** problem+json で返すエラー（第25章） */
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isStatus(value: unknown): value is Status {
  return value === 'todo' || value === 'doing' || value === 'done';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseId(text: string): number {
  if (!/^[1-9]\d{0,8}$/.test(text)) throw new HttpProblem(404, 'タスクが見つかりません');
  return Number(text);
}

/** ボディの項目を確かめる。mode が 'create' なら title が必須、'patch' なら1つ以上が必須 */
function parseFields(body: unknown, mode: 'create' | 'patch'): TaskPatch {
  if (!isPlainObject(body)) throw new HttpProblem(422, 'ボディは JSON のオブジェクトです', [{ field: '', message: 'オブジェクトではありません' }]);
  const errors: FieldError[] = [];
  const out: TaskPatch = {};
  for (const key of Object.keys(body)) {
    if (key !== 'title' && key !== 'status' && key !== 'dueDate') errors.push({ field: key, message: '知らない項目です' });
  }
  const { title, status, dueDate } = body;
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '' || title.trim().length > 100) errors.push({ field: 'title', message: '1〜100文字の文字列です' });
    else out.title = title.trim();
  } else if (mode === 'create') {
    errors.push({ field: 'title', message: '必須です' });
  }
  if (status !== undefined) {
    if (isStatus(status)) out.status = status;
    else errors.push({ field: 'status', message: 'todo・doing・done のどれかです' });
  }
  if (dueDate !== undefined) {
    if (dueDate === null || (typeof dueDate === 'string' && DATE_RE.test(dueDate))) out.dueDate = dueDate;
    else errors.push({ field: 'dueDate', message: 'YYYY-MM-DD の形の文字列か null です' });
  }
  if (mode === 'patch' && errors.length === 0 && Object.keys(out).length === 0) errors.push({ field: '', message: '変える項目が1つもありません' });
  if (errors.length > 0) throw new HttpProblem(422, '入力が正しくありません', errors);
  return out;
}

/** If-Match: "3" → 3。無ければ undefined。形が違えば 412 */
function parseIfMatch(header: string | undefined): number | undefined {
  if (header === undefined) return undefined;
  const m = /^"(\d+)"$/.exec(header);
  if (m === null || m[1] === undefined) throw new HttpProblem(412, 'If-Match の形が正しくありません');
  return Number(m[1]);
}

const etag = (t: Task) => `"${t.version}"`;

export function createApp(repo: TaskRepo): express.Express {
  const app = express();
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/tasks', async (req: Request, res: Response<Task[]>) => {
    const filter: TaskFilter = {};
    const { status, dueBefore } = req.query;
    if (status !== undefined) {
      if (!isStatus(status)) throw new HttpProblem(400, 'status は todo・doing・done のどれかです');
      filter.status = status;
    }
    if (dueBefore !== undefined) {
      if (typeof dueBefore !== 'string' || !DATE_RE.test(dueBefore)) throw new HttpProblem(400, 'dueBefore は YYYY-MM-DD の形です');
      filter.dueBefore = dueBefore;
    }
    res.json(await repo.list(filter));
  });

  app.get('/api/tasks/:id', async (req: Request<{ id: string }>, res: Response<Task>) => {
    const task = await repo.get(parseId(req.params.id));
    if (task === null) throw new HttpProblem(404, 'タスクが見つかりません');
    res.set('ETag', etag(task)).json(task);
  });

  app.post('/api/tasks', async (req: Request<object, Task, unknown>, res: Response<Task>) => {
    const fields = parseFields(req.body, 'create');
    // parseFields('create') は title があることを確かめているが、型（TaskPatch）では title? のまま。ここで組み立て直す
    if (fields.title === undefined) throw new HttpProblem(422, '入力が正しくありません', [{ field: 'title', message: '必須です' }]);
    const input: NewTask = { ...fields, title: fields.title };
    const task = await repo.create(input);
    res.status(201).location(`/api/tasks/${task.id}`).set('ETag', etag(task)).json(task);
  });

  app.patch('/api/tasks/:id', async (req: Request<{ id: string }, Task, unknown>, res: Response<Task>) => {
    const id = parseId(req.params.id);
    const expectedVersion = parseIfMatch(req.get('if-match'));
    const patch = parseFields(req.body, 'patch');
    const updated = await repo.update(id, patch, expectedVersion === undefined ? {} : { expectedVersion });
    if (updated === null) {
      // null は「無い」か「version が違う」。どちらかを確かめて分ける
      if ((await repo.get(id)) === null) throw new HttpProblem(404, 'タスクが見つかりません');
      throw new HttpProblem(412, 'ほかの人が先に変えました。読み直してください');
    }
    res.set('ETag', etag(updated)).json(updated);
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
    // express.json が読めない JSON を受け取ると、status 400 の付いたエラーを投げる
    else if (err instanceof SyntaxError && 'status' in err && err.status === 400) problem = new HttpProblem(400, 'JSON として読めません');
    else {
      console.error(err); // 思っていなかったエラー。中身はログにだけ書き、客には見せない
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
