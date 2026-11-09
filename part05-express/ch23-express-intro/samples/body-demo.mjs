// ボディを読むミドルウェア express.json() と express.urlencoded()（第23章 5節）
//   $ node body-demo.mjs
//   別のターミナルで:
//     curl -i -H 'Content-Type: application/json' -d '{"title":"牛乳"}' http://127.0.0.1:9303/json
//     curl -i -H 'Content-Type: text/plain' -d '{"title":"牛乳"}' http://127.0.0.1:9303/json   ← req.body は undefined
//     curl -i -H 'Content-Type: application/json' -d '{"title":' http://127.0.0.1:9303/json     ← 400
//     curl -i -H 'Content-Type: application/json' -d '"文字列だけ"' http://127.0.0.1:9303/json  ← 400（strict）
//     head -c 20000 /dev/zero | tr '\0' a | sed 's/.*/{"t":"&"}/' | curl -i -H 'Content-Type: application/json' --data-binary @- http://127.0.0.1:9303/json  ← 413
//     curl -i -d 'title=牛乳&tag=a&tag=b' http://127.0.0.1:9303/form
import express from 'express';

const app = express();

// 第20章の readJson と同じ仕事。ただし Content-Type が違うときは、エラーにせず「読まない」
// limit は既定で 100kb。ここでは違いを見やすくするために 10kb にした
app.post('/json', express.json({ limit: '10kb' }), (req, res) => {
  res.json({ type: typeof req.body, body: req.body ?? null });
});

// extended: false（Express 5 の既定）は、URLSearchParams と同じように読む（a[b] を入れ子にしない）
app.post('/form', express.urlencoded({ extended: false, limit: '10kb' }), (req, res) => {
  res.json({ body: req.body ?? null });
});

// ボディを読むミドルウェアの失敗は、エラーとして最後のエラーハンドラに届く。
// err.status（400・413・415 など）と err.type（'entity.parse.failed' など）が付いている
app.use((err, req, res, next) => {
  res.status(err.status ?? 500).json({ error: err.type ?? 'internal', message: err.expose ? err.message : 'サーバのエラー' });
});

app.listen(9303, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9303/ で待っています（Ctrl+C で止める）');
});
