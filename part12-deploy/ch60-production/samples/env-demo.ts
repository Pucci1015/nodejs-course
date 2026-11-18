// 第60章 1.2節: NODE_ENV で Express の動きが変わる（エラーの中身を見せるか）
// 動かし方（章のフォルダで）: node samples/env-demo.ts           → 開発のつもり
//                             NODE_ENV=production node samples/env-demo.ts
// 別のターミナルで: curl -i http://127.0.0.1:9807/boom
import express from 'express';

const app = express();
app.get('/', (_req, res) => {
  res.send(`NODE_ENV=${process.env.NODE_ENV ?? '(なし)'}、app.get('env')=${app.get('env')}\n`);
});
app.get('/boom', () => {
  throw new Error('データベースのパスワード dev-only-password が違います');
});

app.listen(9807, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:9807/ で待っています（env: ${app.get('env')}）`);
});
