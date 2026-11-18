// 2.1節: helmet を付ける前のアプリ（比べるため）
// 動かし方: node samples/plain.ts   → curl -sI http://127.0.0.1:9657/
import express from 'express';

const app = express();

app.get('/', (_req, res) => {
  res.type('html').send('<!doctype html><meta charset="utf-8"><title>ヘッダ</title><p>こんにちは</p>');
});

app.listen(9657, '127.0.0.1', () => console.log('http://127.0.0.1:9657'));
