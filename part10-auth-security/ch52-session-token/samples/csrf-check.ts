// 5.2節: requireSameOrigin を試す小さなアプリ
// 動かし方: node samples/csrf-check.ts   → http://127.0.0.1:9627
import express from 'express';
import { requireSameOrigin } from './same-origin.ts';

const app = express();
app.use(express.json());
app.use(requireSameOrigin(['http://127.0.0.1:9627', 'http://localhost:5173']));

app.get('/api/tasks', (_req, res) => {
  res.json([{ id: 1, title: '牛乳を買う' }]);
});
app.post('/api/tasks', (_req, res) => {
  res.status(201).json({ id: 2, title: '新しいタスク' });
});

app.listen(9627, '127.0.0.1', () => console.log('http://127.0.0.1:9627'));
