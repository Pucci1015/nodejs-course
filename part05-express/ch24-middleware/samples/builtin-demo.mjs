// よく使われるミドルウェア: cors と morgan（第24章 6節）
//   $ node builtin-demo.mjs
//   別のターミナルで:
//     curl -si -H 'Origin: http://localhost:5173' http://127.0.0.1:9313/api/tasks | grep -i '^access-control'
//     curl -si -X OPTIONS -H 'Origin: http://localhost:5173' -H 'Access-Control-Request-Method: PATCH' \
//          -H 'Access-Control-Request-Headers: content-type' http://127.0.0.1:9313/api/tasks/1 | grep -iE '^(HTTP|access-control|vary)'
//     curl -si -H 'Origin: https://evil.example' http://127.0.0.1:9313/api/tasks | grep -i '^access-control'   ← 何も付かない
//   サーバのターミナルに、morgan のログが出る
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';

const app = express();
app.disable('x-powered-by');

// morgan: アクセスログ。'dev' は開発用の短い形。本番では 'combined'（Apache と同じ形）や、自分の形を使う
app.use(morgan('dev'));

// cors: 第2部 第9章で手で書いた CORS のヘッダを付ける。
// 許すオリジンは、配列で決める（'*' にしない）。Cookie を送らせるなら credentials: true
app.use(
  '/api',
  cors({
    origin: ['http://localhost:5173'], // 第8部で使う Vite の開発サーバ
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type'],
    maxAge: 600, // プリフライトの結果を 10 分覚えてもらう
  }),
);

app.get('/api/tasks', (req, res) => res.json([{ id: 1, title: '牛乳を買う' }]));
app.patch('/api/tasks/:id', express.json(), (req, res) => res.json({ id: Number(req.params.id), ...req.body }));

app.listen(9313, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9313/ で待っています（Ctrl+C で止める）');
});
