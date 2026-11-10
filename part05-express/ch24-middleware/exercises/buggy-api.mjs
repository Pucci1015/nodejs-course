// 練習問題9: ミドルウェアの並べ方と書き方のバグを直す
// タスクの API と管理用のページです。確認スクリプトでいくつも失敗します。
//   $ bash check-api.sh                       （このファイルを 127.0.0.1:9319 で起動して確かめる）
//   $ API_TOKEN=dev-only-token LOG_FILE=/tmp/ch24-access.log PORT=9319 node buggy-api.mjs
// 仕様は exercises/README.md の問題9です。
import fs from 'node:fs';
import cors from 'cors';
import express from 'express';

const TOKEN = process.env.API_TOKEN ?? 'dev-only-token'; // 練習用の決まった値。本物の認証は第10部
const logFile = process.env.LOG_FILE;
const writeLog = (line) => (logFile ? fs.appendFileSync(logFile, `${line}\n`) : console.log(line));

class ApiError extends Error {
  constructor(status, error, message) {
    super(message);
    this.status = status;
    this.error = error;
  }
}

const tasks = new Map([
  [1, { id: 1, title: '牛乳を買う' }],
  [2, { id: 2, title: '第24章を読む' }],
]);
let nextId = 3;

// ---- ミドルウェア ----
function logger(req, res, next) {
  writeLog(`${req.method} ${req.originalUrl} ${res.statusCode}`);
  next();
}

function requireAuth(req, res, next) {
  if (req.get('authorization') !== `Bearer ${TOKEN}`) {
    res.status(401).json({ error: 'unauthorized', message: 'トークンが必要です' });
  }
  next();
}

function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) return res.status(err.status).json({ error: err.error, message: err.message });
  console.error(err);
  res.status(500).json({ error: 'internal' });
}

// ---- API ----
const api = express.Router();
api.get('/tasks', (req, res) => {
  const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new ApiError(400, 'bad_request', 'limit は 1〜100');
  res.json([...tasks.values()].slice(0, limit));
});
api.get('/tasks/:id', (req, res) => {
  const task = tasks.get(Number(req.params.id));
  if (!task) throw new ApiError(404, 'not_found', 'ありません');
  res.json(task);
});
api.post('/tasks', requireAuth, (req, res) => {
  const title = req.body?.title;
  if (typeof title !== 'string' || title.trim() === '') throw new ApiError(422, 'validation', 'title が必要です');
  const task = { id: nextId++, title: title.trim() };
  tasks.set(task.id, task);
  res.status(201).json(task);
});
api.delete('/tasks/:id', requireAuth, (req, res) => {
  if (!tasks.delete(Number(req.params.id))) throw new ApiError(404, 'not_found', 'ありません');
  res.sendStatus(204);
});

// ---- 管理用 ----
const admin = express.Router();
admin.get('/stats', (req, res) => res.json({ tasks: tasks.size }));
admin.use(requireAuth);
admin.post('/reset', (req, res) => {
  tasks.clear();
  res.sendStatus(204);
});

// ---- 組み立て ----
const app = express();
app.disable('x-powered-by');
app.use(logger);
app.use(cors({ origin: '*', credentials: true }));
app.use(errorHandler);
app.use('/api', api);
app.use('/admin', admin);
app.use(express.json());

const port = Number(process.env.PORT ?? 9319);
app.listen(port, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${port}/ で待っています`);
});
