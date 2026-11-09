// Idempotency-Key で、POST を送り直しても二重に作らない（第25章 8節）
//   $ node idempotency-demo.mjs
//   別のターミナルで（同じキーで2回送る）:
//     KEY=$(uuidgen)
//     curl -si -X POST -H 'Content-Type: application/json' -H "Idempotency-Key: $KEY" -d '{"title":"牛乳"}' http://127.0.0.1:9324/api/tasks | grep -iE '^(HTTP|idempotent-replayed)|^\{'
//     curl -si -X POST -H 'Content-Type: application/json' -H "Idempotency-Key: $KEY" -d '{"title":"牛乳"}' http://127.0.0.1:9324/api/tasks | grep -iE '^(HTTP|idempotent-replayed)|^\{'
//     curl -si -X POST -H 'Content-Type: application/json' -H "Idempotency-Key: $KEY" -d '{"title":"卵"}' http://127.0.0.1:9324/api/tasks | head -1   ← 422（同じキーで別の中身）
//     curl -s http://127.0.0.1:9324/api/tasks       ← 1件だけ
import crypto from 'node:crypto';
import express from 'express';
import { HttpProblem, problemHandler } from './http-problem.mjs';
import { createTasks } from './tasks-db.mjs';

const db = createTasks(0);
// キー → { fingerprint, status: 'running' | 'done', response }。本物は DB に、期限付きで置く（第6部 第30章）
const seen = new Map();
const KEY_RE = /^[A-Za-z0-9-]{8,64}$/;

function idempotent() {
  return (req, res, next) => {
    const key = req.get('idempotency-key');
    if (key === undefined) return next(); // キーが無ければ、ふつうに動かす（必須にするかは API の方針）
    if (!KEY_RE.test(key)) return next(new HttpProblem(400, { detail: 'Idempotency-Key の形が正しくありません' }));
    // 同じキーで「別の中身」を送られたら、取り違えなので断る
    const fingerprint = crypto.createHash('sha256').update(`${req.method} ${req.originalUrl} ${JSON.stringify(req.body)}`).digest('hex');
    const prev = seen.get(key);
    if (prev) {
      if (prev.fingerprint !== fingerprint) return next(new HttpProblem(422, { detail: 'この Idempotency-Key は、別の内容で使われています' }));
      if (prev.status === 'running') return next(new HttpProblem(409, { detail: '同じリクエストを処理中です' }));
      res.set('Idempotent-Replayed', 'true');
      return res.status(prev.response.status).json(prev.response.body); // 1回目と同じ応答を返す
    }
    seen.set(key, { fingerprint, status: 'running' });
    // res.json を通らずに終わったとき（エラーハンドラが返した 422 など）は、覚えたキーを消す。消さないと、ずっと 409 になる
    res.on('close', () => {
      if (seen.get(key)?.status === 'running') seen.delete(key);
    });
    // 応答を覚えるために res.json を包む
    const json = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 500) seen.set(key, { fingerprint, status: 'done', response: { status: res.statusCode, body } });
      else seen.delete(key); // サーバの失敗は覚えない（送り直せば、やり直せるように）
      return json(body);
    };
    next();
  };
}

const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.get('/api/tasks', (req, res) => res.json(db.all()));
app.post('/api/tasks', idempotent(), (req, res) => {
  const title = String(req.body?.title ?? '').trim();
  if (!title) throw new HttpProblem(422, { detail: 'title を入力してください' });
  const task = db.create({ title });
  res.status(201).location(`/api/tasks/${task.id}`).json(task);
});
app.use(problemHandler());

app.listen(9324, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9324/ で待っています（Ctrl+C で止める）');
});
