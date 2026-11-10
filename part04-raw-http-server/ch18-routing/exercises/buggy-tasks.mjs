// 練習問題9: タスクの API。if 文を並べたルーティングに、バグがたくさんあります
// 確かめる: bash check-tasks.sh
// 使い方: node buggy-tasks.mjs   → http://127.0.0.1:9184/api/tasks
//   管理用: curl -H 'X-Admin-Token: dev-only-token' http://127.0.0.1:9184/admin/stats
import http from 'node:http';

const PORT = Number(process.env.PORT ?? 9184);
// 練習用の決まった値です。本物のアプリでは、トークンをコードに書きません（第10部）
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'dev-only-token';

let tasks = [
  { id: 1, title: '牛乳を買う', done: false, tags: ['買い物'] },
  { id: 2, title: '第18章を読む', done: true, tags: ['勉強', 'node'] },
  { id: 3, title: 'ルータを書く', done: false, tags: ['node'] },
];

function sendJson(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), ...headers });
  res.end(body);
}

const server = http.createServer((req, res) => {
  // 管理用のページは、トークンが無ければ断る
  if (req.url.startsWith('/admin') && req.headers['x-admin-token'] !== ADMIN_TOKEN) {
    sendJson(res, 403, { error: '管理用のトークンが必要です' });
    return;
  }

  const { pathname, searchParams } = new URL(req.url, 'http://localhost');

  if (pathname === '/admin/stats') {
    sendJson(res, 200, { count: tasks.length, done: tasks.filter((t) => t.done).length });
    return;
  }

  if (req.url === '/api/tasks' && req.method === 'GET') {
    const done = searchParams.get('done');
    sendJson(res, 200, done === null ? tasks : tasks.filter((t) => String(t.done) === done));
    return;
  }

  const m = /\/api\/tasks\/(\d+)/.exec(pathname);
  if (m) {
    const id = Number(m[1]);
    if (req.method === 'DELETE') {
      tasks = tasks.filter((t) => t.id !== id);
      res.writeHead(204);
      res.end();
      return;
    }
    const task = tasks.find((t) => t.id === id);
    if (task) sendJson(res, 200, task);
    else sendJson(res, 404, { error: 'ありません' });
    return;
  }

  const t = /^\/api\/tags\/(.+)$/.exec(pathname);
  if (t && req.method === 'GET') {
    const name = decodeURIComponent(t[1]);
    sendJson(res, 200, tasks.filter((x) => x.tags.includes(name)));
    return;
  }

  sendJson(res, 404, { error: 'ありません' });
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
