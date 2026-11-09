// Express のルーティング（第23章 3節）
//   $ node routes-demo.mjs
//   別のターミナルで、先頭のコメントの curl を試す。
//     curl -i 'http://127.0.0.1:9301/tasks?tag=a&tag=b&page=2'
//     curl -i http://127.0.0.1:9301/tasks/42
//     curl -i http://127.0.0.1:9301/tasks/stats
//     curl -i http://127.0.0.1:9301/files/docs/guide.txt
//     curl -i http://127.0.0.1:9301/archive        curl -i http://127.0.0.1:9301/archive/2026
//     curl -i -X DELETE http://127.0.0.1:9301/tasks      ← 405 ではなく 404 になる
//     curl -i -X OPTIONS http://127.0.0.1:9301/tasks     ← Express が自動で答える
//     curl -i http://127.0.0.1:9301/TASKS/               ← 大文字・最後の / でも同じルート
import express from 'express';

const app = express();

app.get('/tasks', (req, res) => {
  // req.query の値は、文字列か「文字列の配列」（同じ名前が2回以上あるとき）
  res.json({ route: 'GET /tasks', query: req.query });
});

// 具体的なルートを先に書く。/tasks/:id を先に書くと、/tasks/stats も :id = 'stats' として選ばれる
app.get('/tasks/stats', (req, res) => {
  res.json({ route: 'GET /tasks/stats' });
});

app.get('/tasks/:id', (req, res) => {
  res.json({ route: 'GET /tasks/:id', params: req.params });
});

app.post('/tasks', (req, res) => {
  res.status(201).json({ route: 'POST /tasks' });
});

// Express 5 の「残り全部」は *名前。値は、/ で分けた配列になる
app.get('/files/*path', (req, res) => {
  res.json({ route: 'GET /files/*path', params: req.params });
});

// {…} の中は、あってもなくてもよい部分
app.get('/archive{/:year}', (req, res) => {
  res.json({ route: 'GET /archive{/:year}', params: req.params });
});

// 同じパスに、メソッドごとのハンドラをまとめて書く
app
  .route('/settings')
  .get((req, res) => res.json({ route: 'GET /settings' }))
  .put((req, res) => res.json({ route: 'PUT /settings' }));

app.listen(9301, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9301/ で待っています（Ctrl+C で止める）');
});
