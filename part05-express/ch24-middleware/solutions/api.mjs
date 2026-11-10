// 練習問題9の模範解答: ミドルウェアの並べ方と書き方を直したもの
//   $ bash ../exercises/check-api.sh ../solutions/api.mjs
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
  // 修正: ステータスは、ハンドラが決めた後でないと分からない。応答が終わってから書く
  res.once('close', () => {
    writeLog(`${req.method} ${req.originalUrl} ${res.writableFinished ? res.statusCode : 'aborted'}`);
  });
  next();
}

function requireAuth(req, res, next) {
  if (req.get('authorization') !== `Bearer ${TOKEN}`) {
    // 修正: 401 を返したら、そこで終わる。return が無いと next() まで進み、
    //       ハンドラ（削除）が動いてから ERR_HTTP_HEADERS_SENT になっていた
    return res.status(401).json({ error: 'unauthorized', message: 'トークンが必要です' });
  }
  next();
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) return res.status(err.status).json({ error: err.error, message: err.message });
  const status = err.status ?? err.statusCode;
  if (status >= 400 && status < 500) return res.status(status).json({ error: 'bad_request', message: 'リクエストが正しくありません' }); // 追加: 壊れた JSON など
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
// 修正: Router の中も、登録した順に動く。requireAuth を、守りたいルートより先に置く
admin.use(requireAuth);
admin.get('/stats', (req, res) => res.json({ tasks: tasks.size }));
admin.post('/reset', (req, res) => {
  tasks.clear();
  res.sendStatus(204);
});

// ---- 組み立て ----
// 並べる順番: ログ → CORS → ボディ → ルート → 404 → エラーハンドラ
const app = express();
app.disable('x-powered-by');
app.use(logger);
// 修正: origin: '*' と credentials: true は一緒に使えない（ブラウザが断る。第2部 第9章 5.3節）。
//       許すオリジンを決めて書く。cors は、合うときだけ Access-Control-Allow-Origin に、そのオリジンを返す
app.use(cors({ origin: ['http://localhost:5173'], credentials: true }));
// 修正: ボディを読むのは、ルートより前。後ろに置くと、ルートが動くときには、まだ読まれていない
app.use(express.json());
app.use('/api', api);
app.use('/admin', admin);
// 追加: どのルートにもあてはまらなかったとき
app.use((req, res) => res.status(404).json({ error: 'not_found', message: `${req.method} ${req.path} はありません` }));
// 修正: エラーハンドラは最後。前に置くと、その後ろで起きたエラーは届かない（Express の既定の HTML になる）
app.use(errorHandler);

const port = Number(process.env.PORT ?? 9319);
app.listen(port, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${port}/ で待っています`);
});
