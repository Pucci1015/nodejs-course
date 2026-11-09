// 1つのハンドラに、何もかも書いてしまった例（第26章 2節。練習問題1で使う）
//   $ node fat-route.mjs
//   別のターミナルで:
//     curl -si -X POST -H 'Content-Type: application/json' -d '{"title":"牛乳","dueDate":"2026-12-01"}' http://127.0.0.1:9330/api/tasks
//     curl -si -X POST -H 'Content-Type: application/json' -d '{"title":"牛乳"}' http://127.0.0.1:9330/api/tasks   ← 409（同じ題名）
// 動きは正しいのですが、テストを書こうとすると困ります。どこが困るか、[1]〜[12] の印を見ながら考えてください。
import express from 'express';

const tasks = []; // [1]
let nextId = 1;

const app = express();
app.use(express.json());

app.post('/api/tasks', (req, res) => {
  const limit = Number(process.env.MAX_TASKS ?? 100); // [2]
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''; // [3]
  if (title === '' || title.length > 100) {
    return res.status(422).json({ error: 'title は 1〜100 文字です' }); // [4]
  }
  const today = new Date().toISOString().slice(0, 10); // [5]
  const dueDate = req.body.dueDate;
  if (dueDate !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || dueDate < today)) {
    return res.status(422).json({ error: 'dueDate は今日より後の YYYY-MM-DD です' }); // [6]
  }
  if (tasks.some((t) => t.title === title && t.status !== 'done')) {
    return res.status(409).json({ error: '同じ題名の、終わっていないタスクがあります' }); // [7]
  }
  if (tasks.length >= limit) {
    return res.status(409).json({ error: `タスクは ${limit} 個までです` }); // [8]
  }
  const task = { id: nextId++, title, status: 'todo', dueDate: dueDate ?? null, createdAt: new Date().toISOString() }; // [9]
  tasks.push(task); // [10]
  console.log(`タスクを作りました: ${task.id} ${task.title} (${req.get('authorization')})`); // [11]
  res.status(201).location(`/api/tasks/${task.id}`).json(task); // [12]
});

app.listen(9330, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9330/ で待っています（Ctrl+C で止める）');
});
