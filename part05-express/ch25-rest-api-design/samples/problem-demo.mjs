// エラーを Problem Details（RFC 9457）の形で返す（第25章 4節）
//   $ node problem-demo.mjs
//   別のターミナルで:
//     curl -si http://127.0.0.1:9320/api/tasks/99
//     curl -si -X POST -H 'Content-Type: application/json' -d '{"title":' http://127.0.0.1:9320/api/tasks
//     curl -si -X POST -H 'Content-Type: application/json' -d '{"title":""}' http://127.0.0.1:9320/api/tasks
//     curl -si http://127.0.0.1:9320/api/boom
import express from 'express';
import { HttpProblem, problemHandler, sendProblem } from './http-problem.mjs';

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.get('/api/tasks/:id', (req, res) => {
  throw new HttpProblem(404, { detail: `タスク ${req.params.id} はありません` });
});

app.post('/api/tasks', (req, res) => {
  if (typeof req.body?.title !== 'string' || req.body.title.trim() === '') {
    throw new HttpProblem(422, {
      type: 'https://example.com/problems/validation', // 自分の API の「エラーの種類」を表す URI（開けば説明が読めるとよい）
      title: '入力が正しくありません',
      errors: [{ pointer: '#/title', detail: 'title を入力してください' }],
    });
  }
  res.status(201).json({ id: 1, title: req.body.title.trim() });
});

app.get('/api/boom', () => {
  throw new Error('DB の接続が切れた（この文は客に見せない）');
});

app.use((req, res) => sendProblem(res, 404, { detail: `${req.method} ${req.path} はありません`, instance: req.originalUrl }));
app.use(problemHandler());

app.listen(9320, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9320/ で待っています（Ctrl+C で止める）');
});
