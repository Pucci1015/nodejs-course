// 文字列をつないで HTML を作ると、表示が崩れる（第21章 2節）
// 使い方: node concat-demo.mjs
//   ブラウザで http://127.0.0.1:9210/       （つなぐだけ）
//         と   http://127.0.0.1:9210/safe   （エスケープしてからつなぐ）を見比べる
import http from 'node:http';
import { escapeHtml } from './mini-html.mjs';

const PORT = 9210;
// HTML で特別な意味を持つ文字（< > & "）が入った、ふつうの題名
const books = [
  { title: 'HTML の <p> と <div> の違い', note: '"段落" と "まとまり"' },
  { title: 'Tom & Jerry の作り方', note: 'R&D の話' },
  { title: '1 < 2 は正しい', note: 'a > b のとき' },
];

function page(esc) {
  return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>本の一覧</title></head><body>'
    + '<h1>本の一覧</h1><ul>'
    + books.map((b) => '<li title="' + esc(b.note) + '">' + esc(b.title) + '</li>').join('')
    + '</ul></body></html>';
}

const server = http.createServer((req, res) => {
  const safe = new URL(`http://localhost${req.url}`).pathname === '/safe';
  const body = page(safe ? escapeHtml : (s) => s);
  console.log(`${req.method} ${req.url}（${safe ? 'エスケープする' : 'つなぐだけ'}）`);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
