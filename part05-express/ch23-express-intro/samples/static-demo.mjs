// 静的ファイルを返す express.static（第23章 6節）
//   $ node static-demo.mjs
//   別のターミナルで:
//     curl -i http://127.0.0.1:9304/                      ← public/index.html
//     curl -i http://127.0.0.1:9304/assets/style.css      ← mount した場所の下
//     curl -i http://127.0.0.1:9304/.env.example          ← ドットファイルは 404
//     curl -i --path-as-is http://127.0.0.1:9304/assets/../static-demo.mjs  ← 公開するフォルダの外は返さない
//     curl -i -H 'Range: bytes=0-9' http://127.0.0.1:9304/assets/style.css   ← 206
import path from 'node:path';
import express from 'express';

const app = express();
const publicDir = path.join(import.meta.dirname, 'public');

// 第19章の serveStatic(root, { mount, index, cacheControl }) と同じ仕事をする
app.use(express.static(publicDir)); // / の下に public を見せる（index.html も）
app.use(
  '/assets',
  express.static(publicDir, {
    index: false, // /assets/ で index.html を返さない
    maxAge: '1h', // Cache-Control: public, max-age=3600
    immutable: false,
    fallthrough: true, // 見つからなければ、次のミドルウェアへ（false なら、ここで 404 を返す）
  }),
);

app.use((req, res) => {
  res.status(404).type('text/plain').send(`見つかりません: ${req.path}`);
});

app.listen(9304, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9304/ で待っています（Ctrl+C で止める）');
});
