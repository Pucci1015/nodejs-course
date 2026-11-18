// 2節: セキュリティのヘッダを helmet でまとめて付ける
// 動かし方: node samples/headers.ts   → curl -sI http://127.0.0.1:9657/
import express from 'express';
import helmet from 'helmet';

const app = express();
// helmet() は、ヘッダを足すミドルウェアと、X-Powered-By を消すミドルウェアをまとめたもの
app.use(helmet());

app.get('/', (_req, res) => {
  res.type('html').send('<!doctype html><meta charset="utf-8"><title>ヘッダ</title><p>こんにちは</p>');
});

app.listen(9657, '127.0.0.1', () => console.log('http://127.0.0.1:9657'));
