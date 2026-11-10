// 第23章 5節で書く、JSON のボディを読むアプリの完成形
// 使い方（~/dev/part05/ch23-express-intro で）: node samples/body.mjs
//   curl で: curl -i -H 'Content-Type: application/json' -d '{"title":"牛乳"}' http://127.0.0.1:9307/tasks
import express from 'express';

const PORT = 9307;
const app = express();
app.disable('x-powered-by');
app.use(express.json()); // Content-Type が application/json のボディを読んで req.body に入れる

const tasks = [];

app.post('/tasks', (req, res) => {
  if (!req.is('application/json')) {
    return res.status(415).json({ error: 'JSON で送ってください' });
  }
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  if (title.length < 1 || title.length > 100) {
    return res.status(422).json({ error: 'title は 1〜100 文字で書いてください' });
  }
  const task = { id: tasks.length + 1, title };
  tasks.push(task);
  res.status(201).location(`/tasks/${task.id}`).json(task);
});

app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
