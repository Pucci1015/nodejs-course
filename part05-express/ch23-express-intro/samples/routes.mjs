// 第23章 3節で書く、パスパラメータとクエリを読むアプリの完成形
// 使い方（~/dev/part05/ch23-express-intro で）: node samples/routes.mjs
//   curl で: curl -s 'http://127.0.0.1:9307/tasks?tag=a&tag=b'   curl -s http://127.0.0.1:9307/tasks/42
import express from 'express';

const PORT = 9307;
const app = express();
app.disable('x-powered-by');

const tasks = [
  { id: 1, title: '牛乳を買う', tags: ['買い物'] },
  { id: 2, title: '第23章を読む', tags: ['勉強', 'node'] },
];

app.get('/tasks', (req, res) => {
  console.log('req.query =', req.query);
  const tag = req.query.tag;
  // ?tag=a なら文字列、?tag=a&tag=b なら配列、無ければ undefined
  const tags = tag === undefined ? [] : Array.isArray(tag) ? tag : [tag];
  const found = tags.length === 0 ? tasks : tasks.filter((t) => tags.some((x) => t.tags.includes(x)));
  res.json(found);
});

// 具体的なルートを先に書く（/tasks/:id より前）
app.get('/tasks/stats', (req, res) => {
  res.json({ count: tasks.length });
});

app.get('/tasks/:id', (req, res) => {
  console.log('req.params =', req.params);
  const id = Number(req.params.id); // req.params の値は、いつも文字列
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    return res.status(404).json({ error: 'not_found' });
  }
  res.json(task);
});

app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
