// zod のスキーマで、ボディ・クエリ・パスパラメータを確かめるミドルウェア（第25章 5節）
//   $ node samples/validate-demo.mjs
//   別のターミナルで:
//     curl -s -X POST -H 'Content-Type: application/json' -d '{"title":"牛乳","dueDate":"2026-11-30"}' http://127.0.0.1:9321/api/tasks
//     curl -s -X POST -H 'Content-Type: application/json' -d '{"title":"","dueDate":"明日","owner":1}' http://127.0.0.1:9321/api/tasks
//     curl -s 'http://127.0.0.1:9321/api/tasks?limit=abc&status=later'
//     curl -s http://127.0.0.1:9321/api/tasks/01
import express from 'express';
import { z } from 'zod';
import { HttpProblem, problemHandler } from './http-problem.mjs';

z.config(z.locales.ja());

/** zod の issue の path（['tags', 1]）を、JSON Pointer（/tags/1）にする（RFC 6901。~ と / はエスケープ） */
const toPointer = (path) => path.map((p) => `/${String(p).replaceAll('~', '~0').replaceAll('/', '~1')}`).join('');

/**
 * validate({ body, query, params }) — 渡したスキーマで確かめ、確かめた後の値を req.valid に入れる。
 * 間違いは、場所ごとに 400（クエリ・パス）か 422（ボディ）にまとめて返す
 */
function validate(schemas) {
  return (req, res, next) => {
    req.valid = {};
    for (const where of ['params', 'query', 'body']) {
      if (!schemas[where]) continue;
      const r = schemas[where].safeParse(req[where] ?? {});
      if (!r.success) {
        const status = where === 'body' ? 422 : 400; // URL の間違いは 400、送った中身の間違いは 422（3.3節）
        // ボディの場所は JSON Pointer（#/title）、クエリとパスは名前（parameter）で示す（RFC 9457 の例と同じ書き方）
        const errors = r.error.issues.map((i) =>
          where === 'body' ? { pointer: `#${toPointer(i.path)}`, detail: i.message } : { parameter: String(i.path[0] ?? ''), detail: i.message },
        );
        return next(new HttpProblem(status, { title: '入力が正しくありません', errors }));
      }
      req.valid[where] = r.data; // Express 5 の req.query は書き換えられないので、別の場所に入れる
    }
    next();
  };
}

const Id = z.strictObject({ id: z.string().regex(/^[1-9][0-9]{0,8}$/, 'id は正の整数です').transform(Number) });
const ListQuery = z.strictObject({
  status: z.enum(['todo', 'doing', 'done']).optional(),
  limit: z.string().regex(/^[1-9][0-9]{0,2}$/, 'limit は 1〜100').transform(Number).pipe(z.number().max(100, 'limit は 1〜100')).default(20),
});
const CreateTask = z.strictObject({
  title: z.string().trim().min(1, 'title を入力してください').max(100),
  dueDate: z.iso.date().optional(),
});

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.get('/api/tasks', validate({ query: ListQuery }), (req, res) => res.json({ query: req.valid.query }));
app.get('/api/tasks/:id', validate({ params: Id }), (req, res) => res.json({ id: req.valid.params.id }));
app.post('/api/tasks', validate({ body: CreateTask }), (req, res) => res.status(201).json(req.valid.body));
app.use(problemHandler());

app.listen(9321, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9321/ で待っています（Ctrl+C で止める）');
});
