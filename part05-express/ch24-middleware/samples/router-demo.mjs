// express.Router でルートを分ける（第24章 7節）
//   $ node router-demo.mjs
//   別のターミナルで:
//     curl -s http://127.0.0.1:9315/api/projects/3/tasks
//     curl -s http://127.0.0.1:9315/api/projects/3/tasks/9
//     curl -s -H 'X-Demo-User: alice' http://127.0.0.1:9315/admin/stats
//     curl -si http://127.0.0.1:9315/admin/stats | head -1        ← 401
import express from 'express';

// ---- タスクのルート（ファイルを分けるなら tasks-routes.mjs） ----
// mergeParams: true で、親の Router の :projectId を req.params で読めるようにする
const tasks = express.Router({ mergeParams: true });
tasks.get('/', (req, res) => res.json({ projectId: req.params.projectId, tasks: [] }));
tasks.get('/:taskId', (req, res) => res.json({ projectId: req.params.projectId, taskId: req.params.taskId }));

// ---- 管理用のルート。Router ごとにミドルウェアを付けられる ----
const admin = express.Router();
admin.use((req, res, next) => {
  // 説明のための簡単な確認。本物の認証は第10部で扱う
  if (req.get('x-demo-user') !== 'alice') return res.status(401).json({ error: 'ログインしてください' });
  next();
});
admin.get('/stats', (req, res) => res.json({ users: 1, tasks: 0 }));

// ---- 組み立て ----
const app = express();
app.use('/api/projects/:projectId/tasks', tasks);
app.use('/admin', admin);
app.use((req, res) => res.status(404).json({ error: 'not_found' }));

app.listen(9315, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9315/ で待っています（Ctrl+C で止める）');
});
