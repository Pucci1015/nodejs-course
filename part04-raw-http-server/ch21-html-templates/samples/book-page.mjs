// 第21章 5節で書く、html タグと部品の関数でページを組み立てるサーバの完成形
// 使い方（~/dev/part04/ch21-html-templates で）: node samples/book-page.mjs → ブラウザで http://127.0.0.1:9216/
// 本文で自分が書くファイル（book-page.mjs）は ./samples/mini-html.mjs を、このファイルは同じフォルダの ./mini-html.mjs を読み込む
import http from 'node:http';
import { html } from './mini-html.mjs';

const PORT = 9216;

const books = [
  { title: 'HTML の <p> と <div> の違い', note: '"段落" と "まとまり"', done: true },
  { title: 'Tom & Jerry の作り方', note: 'R&D の話', done: false },
  { title: '1 < 2 は正しい', note: 'a > b のとき', done: false },
];

// 全部のページで共通の外側
function layout({ title, body }) {
  return html`<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>${title} | 本棚</title>
</head>
<body>
  <h1>${title}</h1>
  ${body}
</body>
</html>`;
}

// 1冊分の部品
function bookItem(book) {
  return html`<li title="${book.note}">${book.title}${book.done ? html` <strong>読了</strong>` : null}</li>`;
}

const server = http.createServer((req, res) => {
  if (req.url !== '/') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('見つかりません\n');
  }
  const page = layout({ title: '本棚', body: html`<ul>${books.map(bookItem)}</ul>` });
  const text = String(page);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': Buffer.byteLength(text) });
  res.end(text);
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
