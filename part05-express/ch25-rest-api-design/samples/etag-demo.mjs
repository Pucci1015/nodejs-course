// ETag と If-Match で、同時の書き換えを見つける（楽観的ロック。第25章 7節）
//   $ node samples/etag-demo.mjs
//   別のターミナルで:
//     curl -si http://127.0.0.1:9323/api/tasks/1 | grep -iE '^(etag|HTTP)'           ← ETag: "1"
//     curl -si -X PATCH -H 'Content-Type: application/json' -H 'If-Match: "1"' -d '{"title":"A さんの変更"}' http://127.0.0.1:9323/api/tasks/1 | grep -iE '^(etag|HTTP)'
//     curl -si -X PATCH -H 'Content-Type: application/json' -H 'If-Match: "1"' -d '{"title":"B さんの変更"}' http://127.0.0.1:9323/api/tasks/1 | head -1   ← 412
//     curl -si -X PATCH -H 'Content-Type: application/json' -d '{"title":"If-Match なし"}' http://127.0.0.1:9323/api/tasks/1 | head -1   ← 428
//     curl -si -H 'If-None-Match: "2"' http://127.0.0.1:9323/api/tasks/1 | head -1   ← 304
import express from 'express';
import { HttpProblem, problemHandler } from './http-problem.mjs';
import { createTasks } from './tasks-db.mjs';

const db = createTasks(3);
const etagOf = (task) => `"${task.version}"`; // 強い ETag。version は変えるたびに 1 増える

const app = express();
app.disable('x-powered-by');
app.set('etag', false); // Express の自動の ETag（本文から作る弱い ETag）を止めて、自分で付ける
app.use(express.json());

app.get('/api/tasks/:id', (req, res) => {
  const task = db.get(Number(req.params.id));
  if (!task) throw new HttpProblem(404);
  res.set('ETag', etagOf(task));
  if (req.get('if-none-match') === etagOf(task)) return res.sendStatus(304); // 変わっていなければ本文を送らない
  res.json(task);
});

app.patch('/api/tasks/:id', (req, res) => {
  const task = db.get(Number(req.params.id));
  if (!task) throw new HttpProblem(404);
  const ifMatch = req.get('if-match');
  // If-Match が無ければ 428: 「どの版を見て変えようとしているのか」を必ず送ってもらう（RFC 6585）
  if (!ifMatch) throw new HttpProblem(428, { detail: 'If-Match ヘッダに、GET で受け取った ETag を入れてください' });
  // 見ていた版と今の版が違えば 412: 誰かが先に変えた（RFC 9110 13.1.1）
  if (ifMatch !== etagOf(task)) throw new HttpProblem(412, { detail: '他の人が先に変更しました。読み直してから変更してください' });
  const updated = db.update(task.id, { title: String(req.body?.title ?? task.title) });
  res.set('ETag', etagOf(updated)).json(updated);
});

app.use(problemHandler());

app.listen(9323, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9323/ で待っています（Ctrl+C で止める）');
});
