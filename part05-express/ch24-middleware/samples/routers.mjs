// 第24章 7節で書く、express.Router でルートを分けるアプリの完成形
// 使い方（~/dev/part05/ch24-middleware で）: node samples/routers.mjs
//   curl で: curl -s http://127.0.0.1:9317/api/tasks/2   curl -i http://127.0.0.1:9317/admin/stats
import express from 'express';

const PORT = 9317;
const app = express();
app.disable('x-powered-by');

// タスクの Router（/api/tasks の下に付ける）
const tasks = express.Router();
const list = [{ id: 1, title: '牛乳を買う' }, { id: 2, title: '第24章を読む' }];
tasks.get('/', (req, res) => res.json(list));
tasks.get('/:id', (req, res) => {
  const task = list.find((t) => t.id === Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'not_found' });
  res.json(task);
});

// 管理用の Router（/admin の下に付ける）。最初に守りのミドルウェアを入れる
const admin = express.Router();
admin.use((req, res, next) => {
  if (req.get('x-role') !== 'admin') return res.status(401).json({ error: 'unauthorized' });
  next();
});
admin.get('/stats', (req, res) => res.json({ tasks: list.length }));

app.use('/api/tasks', tasks);
app.use('/admin', admin);

app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
