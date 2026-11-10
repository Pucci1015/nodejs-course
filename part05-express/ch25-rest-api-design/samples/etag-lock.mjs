// 第25章 7節で書く、ETag と If-Match で同時の書き換えを見つける API の完成形
// 使い方（~/dev/part05/ch25-rest-api-design で）: node samples/etag-lock.mjs
//   curl で: curl -i http://127.0.0.1:9327/api/tasks/1
import express from 'express';

const PORT = 9327;
const app = express();
app.disable('x-powered-by');
app.set('etag', false); // Express の自動の（弱い）ETag を止めて、自分で付ける
app.use(express.json());

const task = { id: 1, title: '牛乳を買う', version: 1 };
const etagOf = (t) => `"${t.version}"`; // 強い ETag

app.get('/api/tasks/1', (req, res) => {
  res.set('ETag', etagOf(task)).json(task);
});

app.patch('/api/tasks/1', (req, res) => {
  const ifMatch = req.get('if-match');
  if (ifMatch === undefined) {
    return res.status(428).json({ error: 'If-Match を付けてください' });
  }
  if (ifMatch !== etagOf(task)) {
    return res.status(412).json({ error: '他の人が先に変えました。読み直してください' });
  }
  if (typeof req.body?.title === 'string') task.title = req.body.title;
  task.version += 1;
  res.set('ETag', etagOf(task)).json(task);
});

app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
