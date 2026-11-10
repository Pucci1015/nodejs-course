// 練習問題9 解答例: タスクの API を、Router（問題6）で書き直したもの
// 使い方: node tasks.mjs   → http://127.0.0.1:9184/api/tasks
import http from 'node:http';
import { createApp, HttpError } from '../../ch17-minimal-server/solutions/app.mjs';
import { noContent, sendJson } from '../../ch17-minimal-server/solutions/send.mjs';
import { Router } from './router.mjs';

const PORT = Number(process.env.PORT ?? 9184);
// 練習用の決まった値です。本物のアプリでは、トークンをコードに書きません（第10部）
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'dev-only-token';

let tasks = [
  { id: 1, title: '牛乳を買う', done: false, tags: ['買い物'] },
  { id: 2, title: '第18章を読む', done: true, tags: ['勉強', 'node'] },
  { id: 3, title: 'ルータを書く', done: false, tags: ['node'] },
];

// 修正: :id が数字でなければ 404（/api/tasks/abc は「そんなタスクは無い」）
function findTask(params) {
  const task = /^\d+$/.test(params.id) ? tasks.find((t) => t.id === Number(params.id)) : undefined;
  if (!task) throw new HttpError(404, 'ありません');
  return task;
}

// 修正: 管理用かどうかは、Router が選んだルートで決める。
// 生の req.url の文字列で調べると、/./admin や //x/admin のように「書き方を変えた同じパス」を見逃す
function requireAdmin(handler) {
  return (req, res, params) => {
    // 比べ方（timingSafeEqual）は第10部で見直します
    if (req.headers['x-admin-token'] !== ADMIN_TOKEN) throw new HttpError(403, '管理用のトークンが必要です');
    return handler(req, res, params);
  };
}

const router = new Router()
  .get('/api/tasks', (req, res) => {
    // 修正: req.url ではなく、pathname で選ぶ（Router がする）。クエリは req.query
    const done = req.query.get('done');
    sendJson(res, 200, done === null ? tasks : tasks.filter((t) => String(t.done) === done));
  })
  .get('/api/tasks/:id', (req, res, params) => sendJson(res, 200, findTask(params)))
  .delete('/api/tasks/:id', (req, res, params) => {
    const task = findTask(params);
    tasks = tasks.filter((t) => t !== task);
    noContent(res);
  })
  // 修正: 壊れた %xx は Router が 400 にする（decodeURIComponent の URIError で落ちない）
  .get('/api/tags/:name', (req, res, params) => sendJson(res, 200, tasks.filter((t) => t.tags.includes(params.name))))
  .get('/admin/stats', requireAdmin((req, res) => {
    sendJson(res, 200, { count: tasks.length, done: tasks.filter((t) => t.done).length });
  }));

const server = http.createServer(createApp(router.handle));
server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
