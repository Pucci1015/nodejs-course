// res.render とビューエンジン（第23章 7節）
// 第21章で作った小さなテンプレートエンジン（../../lib/template.mjs）を、Express のビューエンジンとして登録する
//   $ node view-engine-demo.mjs
//   別のターミナルで: curl -i http://127.0.0.1:9306/        curl -i 'http://127.0.0.1:9306/?q=<b>'
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { compile } from '../../lib/template.mjs';

const app = express();

// ビューエンジンは「(ファイルのパス, 値, コールバック) を受け取って、文字列を返す関数」
app.engine('html', async (filePath, options, callback) => {
  try {
    const source = await fs.readFile(filePath, 'utf8');
    callback(null, compile(source)(options));
  } catch (err) {
    callback(err); // 読めない・書き方が違う、は Express のエラーハンドラへ
  }
});
app.set('views', path.join(import.meta.dirname, 'views')); // テンプレートを探すフォルダ
app.set('view engine', 'html'); // res.render('index') の拡張子を省いたときに使う

app.get('/', (req, res) => {
  const tasks = [
    { title: '牛乳を買う', done: false },
    { title: '第23章を読む', done: true },
  ];
  // res.render は、views/index.html を探し、値を渡して文字列にし、text/html で返す。
  // 値には、app.locals と res.locals も混ざる
  res.render('index', { title: 'タスク', tasks, q: req.query.q ?? '' });
});

app.locals.siteName = '第23章のサンプル'; // すべてのテンプレートで使える値

app.listen(9306, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9306/ で待っています（Ctrl+C で止める）');
});
