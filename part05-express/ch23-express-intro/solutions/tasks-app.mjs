// 練習問題5の模範解答: タスクの REST API を Express で書く
import express from 'express';

// 追加: 400 番台のエラー。メッセージは客に見せてよい（第17章の HttpError と同じ考え方）
class ApiError extends Error {
  constructor(status, error, message) {
    super(message);
    this.status = status;
    this.error = error;
  }
}

// 追加: 正の整数の形だけを受け付ける（0・-1・01・1.5・1e3 は不可）。Number('1e3') は 1000 になるので、先に形を見る
function parseId(text) {
  if (!/^[1-9][0-9]{0,8}$/.test(text)) throw new ApiError(400, 'bad_request', 'id は正の整数で指定してください');
  return Number(text);
}

// 追加: title の確かめ。前後の空白を取ってから数える
function checkTitle(title) {
  if (typeof title !== 'string' || title.trim() === '') return 'title を文字列で入力してください';
  if (title.trim().length > 100) return 'title は100文字以内にしてください';
  return null;
}

// 追加: ボディが JSON のオブジェクトであることを確かめる（配列・null・文字列は不可）
function requireObject(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(422, 'validation', 'ボディは JSON のオブジェクトにしてください');
  }
}

// 追加: express.json() は Content-Type が違うと「何もしない」ので、415 は自分で返す
function requireJson(req, res, next) {
  if (!req.is('application/json')) {
    return next(new ApiError(415, 'unsupported_media_type', 'Content-Type は application/json にしてください'));
  }
  next();
}

/**
 * @param {{ store: ReturnType<import('../exercises/tasks-store.mjs').createTaskStore> }} deps
 * @returns {import('express').Express}
 */
export function createTasksApp({ store }) {
  const app = express();
  app.disable('x-powered-by');
  // 追加: すべてのルートで JSON のボディを読む（既定の上限 100kb を超えると 413 のエラーが next に届く）
  app.use(express.json());

  app.get('/api/tasks', (req, res) => {
    const { done } = req.query;
    // 修正: ?done が無ければ全部。'true'・'false' 以外（配列・空文字を含む）は 400
    if (done === undefined) return res.json(store.list());
    if (done !== 'true' && done !== 'false') {
      throw new ApiError(400, 'bad_request', 'done は true か false で指定してください');
    }
    res.json(store.list({ done: done === 'true' }));
  });

  app.get('/api/tasks/:id', (req, res) => {
    const task = store.get(parseId(req.params.id));
    if (!task) throw new ApiError(404, 'not_found', 'タスクがありません');
    res.json(task);
  });

  app.post('/api/tasks', requireJson, (req, res) => {
    requireObject(req.body);
    const problem = checkTitle(req.body.title);
    if (problem) throw new ApiError(422, 'validation', problem);
    const task = store.create({ title: req.body.title.trim() });
    // 201 と、作ったものの場所（第2部 第10章 5節）
    res.status(201).location(`/api/tasks/${task.id}`).json(task);
  });

  app.patch('/api/tasks/:id', requireJson, (req, res) => {
    const id = parseId(req.params.id);
    requireObject(req.body);
    // 知らない項目は、黙って捨てずに 422（つづりの間違いに気づけるように）
    const unknown = Object.keys(req.body).filter((k) => k !== 'title' && k !== 'done');
    if (unknown.length > 0) throw new ApiError(422, 'validation', `変えられない項目です: ${unknown.join(', ')}`);
    const changes = {};
    if (Object.hasOwn(req.body, 'title')) {
      const problem = checkTitle(req.body.title);
      if (problem) throw new ApiError(422, 'validation', problem);
      changes.title = req.body.title.trim();
    }
    if (Object.hasOwn(req.body, 'done')) {
      if (typeof req.body.done !== 'boolean') throw new ApiError(422, 'validation', 'done は true か false にしてください');
      changes.done = req.body.done;
    }
    const task = store.update(id, changes);
    if (!task) throw new ApiError(404, 'not_found', 'タスクがありません');
    res.json(task);
  });

  app.delete('/api/tasks/:id', (req, res) => {
    if (!store.remove(parseId(req.params.id))) throw new ApiError(404, 'not_found', 'タスクがありません');
    res.sendStatus(204);
  });

  // 追加: どのルートにもあてはまらなかったとき。ルートをすべて書いた後に置く
  app.use((req, res) => {
    res.status(404).json({ error: 'not_found', message: `${req.method} ${req.path} はありません` });
  });

  // 追加: エラーハンドラ（引数が4つ）。いちばん最後に置く
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
      return res.status(err.status).json({ error: err.error, message: err.message });
    }
    // express.json() や Express が付けた status（400 の JSON の誤り、413、壊れた %xx の 400 など）
    const status = err.status ?? err.statusCode;
    if (status >= 400 && status < 500) {
      const error = status === 413 ? 'payload_too_large' : 'bad_request';
      return res.status(status).json({ error, message: err.expose ? err.message : 'リクエストが正しくありません' });
    }
    console.error(err); // 500 の詳しいことはログだけに書く
    res.status(500).json({ error: 'internal', message: 'サーバのエラーです' });
  });

  return app;
}
