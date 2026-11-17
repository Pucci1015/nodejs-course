// ルートの層。HTTP を読んで確かめ、サービスを呼び、応答の形にする
// 第26章 練習問題8の模範解答（ch26-app-structure/solutions/tasks-routes.mjs）から始めて、
// 第25章のページ分け・ETag・冪等キーを足した（「追加（成果物）」）
// 第6部: ページ分けを SQL に任せ、冪等キーの置き場所を外から受け取るようにした（「変更（第6部）」）
// 変更（第7部）: TypeScript にした。req.body（any）は使わず、Zod で確かめた後の値だけを使う（第38章 4節）
// 変更（第10部）: サービスは、リクエストごとに serviceFor(req) で受け取る（ログインしている人のタスクだけを扱うサービス）。冪等キーも人ごとに分ける
import express, { type ErrorRequestHandler, type Request, type RequestHandler, type Response } from 'express';
import { z } from 'zod';
import { ConflictError, NotFoundError, PreconditionFailedError, ValidationError } from '../errors.ts';
import { CursorError, decodeCursor, encodeCursor } from '../lib/cursor.ts';
import { evaluatePreconditions } from '../lib/preconditions.ts';
import { idempotency } from '../middleware/idempotency.ts';
import { HttpProblem } from '../middleware/problem.ts';
import type { TaskService } from '../services/tasks.ts';
import type { CursorPosition, IdempotencyStore, Task } from '../types.ts';
import { parseListQuery } from './list-query.ts';

z.config(z.locales.ja());

const Id = z.string().regex(/^[1-9][0-9]{0,8}$/).transform(Number);
// ここで確かめるのは「形」（型・知らない項目）だけ。長さや締め切りなどの決まりは、サービスが確かめる
const CreateBody = z.strictObject({
  title: z.string(),
  dueDate: z.string().nullable().optional(),
});
const UpdateBody = z.strictObject({
  title: z.string().optional(),
  status: z.string().optional(),
  dueDate: z.string().nullable().optional(),
});

type IdParams = { id: string };

/** パスの id を数にする。形が違えば、そのタスクは無い（404）。サービスは呼ばない */
function parseId(req: Request<IdParams>): number {
  const r = Id.safeParse(req.params.id);
  if (!r.success) throw new HttpProblem(404, { detail: `タスク ${req.params.id} はありません` });
  return r.data;
}

/** JSON のボディだけを受け付ける */
const requireJson: RequestHandler = (req, _res, next) => {
  if (!req.is('application/json')) return next(new HttpProblem(415, { detail: 'Content-Type: application/json で送ってください' }));
  next();
};

// 追加（成果物）: タスクの version を、強い ETag にする（第25章 7.3節）
const etagOf = (task: Task) => `"${task.version}"`;

/** 追加（成果物）: パスはあるが、メソッドが違うときは 405 と Allow（Express は 404 にしてしまう。第23章） */
const methodNotAllowed =
  (methods: string[]): RequestHandler =>
  (req, _res, next) =>
    next(new HttpProblem(405, { detail: `${req.method} は使えません`, headers: { Allow: methods.join(', ') } }));

export type TasksRouterDeps = {
  /** 変更（第10部）: リクエストから、その人のためのサービスを作る関数（server.ts が渡す） */
  serviceFor: (req: Request) => TaskService;
  cursorSecret: string;
  /** 変更（第6部）: 冪等キーを覚える場所。server.ts が、データベースのものを作って渡す */
  idempotencyStore: IdempotencyStore;
};

/** 一覧の応答 */
type ListBody = { items: Task[]; nextCursor: string | null };

export function createTasksRouter({ serviceFor, cursorSecret, idempotencyStore }: TasksRouterDeps): express.Router {
  const router = express.Router();
  // 追加（第10部）: 冪等キーは「だれが送ったか」ごとに覚える（alice と bob が同じキーを使っても、取り違えない）
  const scope = (req: Request) => String(req.user?.id ?? '');

  /**
   * 追加（成果物）: 変える・消すリクエストの If-Match を確かめ、客が見ていた version を返す。
   * 無いタスクは 404（If-Match より先）。If-Match が無ければ 428、違えば 412
   */
  async function expectedVersion(req: Request<IdParams>, service: TaskService, id: number): Promise<number> {
    const task = await service.get(id);
    const r = evaluatePreconditions({
      method: req.method,
      ifMatch: req.get('if-match'),
      ifNoneMatch: req.get('if-none-match'),
      etag: etagOf(task),
      exists: true,
      requireIfMatch: true,
    });
    if (r === 428) throw new HttpProblem(428, { detail: 'If-Match に、読んだときの ETag を入れて送ってください' });
    if (r === 412) throw new HttpProblem(412, { detail: 'ほかの人が先に変えました。読み直してください', headers: { ETag: etagOf(task) } });
    return task.version;
  }

  // 一覧。?status=todo,doing&due_before=2026-12-01&sort=-createdAt&limit=20&cursor=…
  router.get('/', async (req: Request, res: Response<ListBody>) => {
    const q = parseListQuery(req.query); // 間違いは 400（第25章 練習問題6）
    // 変更（第6部）: カーソルを読んでから、1ページ分だけをデータの層に頼む
    let after: CursorPosition | undefined;
    if (q.cursor !== undefined) {
      try {
        after = decodeCursor(q.cursor, q.sort, cursorSecret);
      } catch (err) {
        if (err instanceof CursorError) throw new HttpProblem(400, { title: 'クエリが正しくありません', errors: [{ parameter: 'cursor', detail: err.message }] });
        throw err;
      }
    }
    const { items, hasMore } = await serviceFor(req).listPage({ statuses: q.status, dueBefore: q.dueBefore, sort: q.sort, limit: q.limit, after });
    const last = items.at(-1);
    res.json({ items, nextCursor: hasMore && last !== undefined ? encodeCursor(q.sort, last, cursorSecret) : null });
  });

  router.post('/', requireJson, idempotency(idempotencyStore, { scope }), async (req: Request, res: Response<Task>) => {
    const body = CreateBody.parse(req.body); // ZodError は problemHandler が 422 にする
    const task = await serviceFor(req).create(body);
    res.status(201).location(`${req.baseUrl}/${task.id}`).set('ETag', etagOf(task)).json(task);
  });

  router.all('/', methodNotAllowed(['GET', 'HEAD', 'POST']));

  router.get('/:id', async (req: Request<IdParams>, res: Response<Task>) => {
    const task = await serviceFor(req).get(parseId(req));
    // 追加（成果物）: If-None-Match が今の ETag と同じなら 304（本文なし）。画面は「変わったか」を安く確かめられる
    const r = evaluatePreconditions({ method: req.method, ifMatch: req.get('if-match'), ifNoneMatch: req.get('if-none-match'), etag: etagOf(task), exists: true });
    res.set('ETag', etagOf(task)).set('Cache-Control', 'no-cache'); // no-cache は「覚えてよいが、使う前に必ず確かめて」
    if (r === 304) {
      res.status(304).end();
      return;
    }
    if (r === 412) throw new HttpProblem(412);
    res.json(task);
  });

  router.patch('/:id', requireJson, async (req: Request<IdParams>, res: Response<Task>) => {
    const id = parseId(req);
    const service = serviceFor(req);
    const version = await expectedVersion(req, service, id);
    const body = UpdateBody.parse(req.body);
    const task = await service.update(id, body, { expectedVersion: version });
    res.set('ETag', etagOf(task)).json(task);
  });

  router.delete('/:id', async (req: Request<IdParams>, res) => {
    const id = parseId(req);
    const service = serviceFor(req);
    const version = await expectedVersion(req, service, id);
    await service.remove(id, { expectedVersion: version });
    res.sendStatus(204);
  });

  router.all('/:id', methodNotAllowed(['GET', 'HEAD', 'PATCH', 'DELETE']));

  return router;
}

/**
 * サービスのエラー（仕事の言葉）を、HTTP の言葉（HttpProblem）に読み替えるエラーハンドラ。
 * problemHandler の前に置く。知らないエラーは、そのまま次へ
 */
export function mapDomainErrors(): ErrorRequestHandler {
  return (err: unknown, _req, _res, next) => {
    if (err instanceof NotFoundError) return next(new HttpProblem(404, { detail: err.message }));
    if (err instanceof ConflictError) return next(new HttpProblem(409, { detail: err.message }));
    if (err instanceof PreconditionFailedError) return next(new HttpProblem(412, { detail: err.message })); // 追加（成果物）
    if (err instanceof ValidationError) {
      const errors = [{ ...(err.field ? { pointer: `#/${err.field}` } : {}), detail: err.message }];
      return next(new HttpProblem(422, { errors }));
    }
    next(err);
  };
}
