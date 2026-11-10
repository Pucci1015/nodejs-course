// 練習問題8: 読書メモのサイト。表示のバグがたくさんあります
// 確かめる: bash check-views.sh
// 使い方: node buggy-views.mjs   → ブラウザで http://127.0.0.1:9215/
import http from 'node:http';
import { notes } from './notes-data.mjs';

const PORT = Number(process.env.PORT ?? 9215);
const PER_PAGE = 10;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function layout(title, body) {
  return `<!doctype html><html lang="ja"><head><title>${esc(title)} | 読書メモ</title></head><body>
<header><a href="/">読書メモ</a></header>
<main>${body}</main>
</body></html>`;
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'text/html', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function listPage(url) {
  const q = url.searchParams.get('q') ?? '';
  const found = q ? notes.filter((n) => n.title.includes(q)) : notes;
  const page = Number(url.searchParams.get('page') ?? 1);
  const pages = Math.floor(found.length / PER_PAGE);
  const items = found.slice(page * PER_PAGE - PER_PAGE + 1, page * PER_PAGE + 1);
  let nav = '';
  for (let i = 1; i <= pages; i++) {
    nav += i === page ? `<span aria-current="page">${i}</span>` : `<a href="/?${q ? `q=${q}&` : ''}page=${i}">${i}</a>`;
  }
  return layout(q ? `「${q}」の検索` : '一覧', `
<form action="/"><input name="q" value="${esc(q)}"> <button>探す</button></form>
<h1>${q ? `「${q}」の検索結果（${found.length}件）` : 'メモの一覧'}</h1>
<ul>${items.map((n) => `<li><a href="/notes/${n.id}">${n.title}</a></li>`).join('')}</ul>
<nav class="pagination">${nav}</nav>`);
}

function detailPage(note) {
  const title = esc(note.title);
  return layout(note.title, `
<h1>${esc(title)}</h1>
<p class="memo">${note.memo}</p>
${note.tags.length ? `<ul class="tags">${note.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
${note.source ? `<p><a href="${esc(note.source)}">出典</a></p>` : ''}
<p><a href="/notes/${note.id}/edit">直す</a></p>
<script>const note = ${JSON.stringify({ id: note.id, title: note.title })}; console.log('このページのメモ:', note.title);</script>`);
}

function editPage(note) {
  return layout(`${note.title} を直す`, `
<h1>直す</h1>
<form method="post" action="/notes/${note.id}">
  <p><label>題名 <input name="title" value=${esc(note.title)}></label></p>
  <p><label>メモ<br><textarea name="memo">${note.memo ?? ''}</textarea></label></p>
  <p><button disabled>保存（この練習問題では作らない）</button></p>
</form>`);
}

const server = http.createServer((req, res) => {
  const url = new URL(`http://localhost${req.url}`);
  console.log(req.method, req.url);
  let m;
  if (url.pathname === '/') return send(res, 200, listPage(url));
  if ((m = /^\/notes\/(\d+)$/.exec(url.pathname))) return send(res, 200, detailPage(notes.find((n) => n.id === Number(m[1]))));
  if ((m = /^\/notes\/(\d+)\/edit$/.exec(url.pathname))) return send(res, 200, editPage(notes.find((n) => n.id === Number(m[1]))));
  send(res, 404, layout('ありません', '<h1>ありません</h1>'));
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
