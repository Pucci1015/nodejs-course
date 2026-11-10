// 第25章 3・4節で書く、ステータスコードと Problem Details を返す API の完成形
// 使い方（~/dev/part05/ch25-rest-api-design で）: node samples/problem-api.mjs
//   curl で: curl -i http://127.0.0.1:9327/api/tasks/99
import http from 'node:http';
import express from 'express';

const PORT = 9327;
const app = express();
app.disable('x-powered-by');
app.use(express.json());

const tasks = new Map([[1, { id: 1, title: '牛乳を買う' }]]);
let nextId = 2;

// エラーを Problem Details（application/problem+json）で返す
function sendProblem(res, status, detail) {
  res.status(status).type('application/problem+json').json({
    type: 'about:blank',
    title: http.STATUS_CODES[status], // 404 → 'Not Found'
    status,
    detail,
    instance: res.req.originalUrl,
  });
}

app.get('/api/tasks/:id', (req, res) => {
  const task = tasks.get(Number(req.params.id));
  if (!task) return sendProblem(res, 404, `タスク ${req.params.id} はありません`);
  res.json(task);
});

app.post('/api/tasks', (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (title === '') return sendProblem(res, 422, 'title を入力してください');
  const task = { id: nextId++, title };
  tasks.set(task.id, task);
  res.status(201).location(`/api/tasks/${task.id}`).json(task); // 作ったら 201 と Location
});

app.delete('/api/tasks/:id', (req, res) => {
  if (!tasks.delete(Number(req.params.id))) return sendProblem(res, 404, `タスク ${req.params.id} はありません`);
  res.sendStatus(204); // 消したら、本文なしの 204
});

app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
