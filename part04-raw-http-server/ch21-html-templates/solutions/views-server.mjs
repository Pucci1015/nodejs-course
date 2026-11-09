// 練習問題5の模範解答: 読書メモのサイト
// 使い方: node views-server.mjs   → ブラウザで http://127.0.0.1:9215/
// 確かめる: bash ../exercises/check-views.sh ../solutions/views-server.mjs
import http from 'node:http';
import { createApp, HttpError } from '../../ch17-minimal-server/solutions/app.mjs';
import { sendHtml } from '../../ch17-minimal-server/solutions/send.mjs';
import { Router } from '../../ch18-routing/solutions/router.mjs';
import { html } from '../samples/mini-html.mjs';
import { safeUrl, jsonForScript } from './html-helpers.mjs';
import { paginate, pagination } from './views.mjs';
import { notes } from '../exercises/notes-data.mjs';

const PORT = Number(process.env.PORT ?? 9215);

// 修正: すべてのページを html タグで組み立てる。外側は1つの layout にまとめる
function layout({ title, body }) {
  return html`<!doctype html>
<html lang="ja">
<head><meta charset="utf-8"><title>${title} | 読書メモ</title></head>
<body>
<header><a href="/">読書メモ</a></header>
<main>${body}</main>
</body>
</html>`;
}

// 修正: sendHtml は Content-Type に charset=utf-8 を付ける（第17章）
const page = (res, title, body) => sendHtml(res, 200, String(layout({ title, body })));

function findNote(id) {
  const note = notes.find((n) => String(n.id) === id);
  if (!note) throw new HttpError(404, 'そのメモはありません'); // 追加: 無い id は 404（500 にしない）
  return note;
}

const router = new Router()
  .get('/', (req, res) => {
    const q = req.query.get('q') ?? '';
    const found = q ? notes.filter((n) => n.title.includes(q)) : notes;
    const p = paginate(found, { page: req.query.get('page') ?? 1, perPage: 10 }); // 修正: ページのずれ
    page(res, q ? `「${q}」の検索` : '一覧', html`
<form action="/"><input name="q" value="${q}"> <button>探す</button></form>
<h1>${q ? `「${q}」の検索結果（${found.length}件）` : 'メモの一覧'}</h1>
<ul>${p.items.map((n) => html`<li><a href="/notes/${n.id}">${n.title}</a></li>`)}</ul>
${pagination({ page: p.page, pages: p.pages, baseUrl: '/', query: { q: q || null } })}`);
  })
  .get('/notes/:id', (req, res, { id }) => {
    const note = findNote(id);
    page(res, note.title, html`
<h1>${note.title}</h1>
${note.memo === null ? html`<p class="memo empty">メモはありません</p>` : html`<p class="memo">${note.memo}</p>`}
${note.tags.length ? html`<ul class="tags">${note.tags.map((t) => html`<li>${t}</li>`)}</ul>` : null}
${note.source ? html`<p><a href="${safeUrl(note.source)}">出典</a></p>` : null}
<p><a href="/notes/${note.id}/edit">直す</a></p>
<script>const note = ${jsonForScript({ id: note.id, title: note.title })}; console.log('このページのメモ:', note.title);</script>`);
  })
  .get('/notes/:id/edit', (req, res, { id }) => {
    const note = findNote(id);
    // 修正: 属性の値は引用符で囲む。textarea の中身もエスケープする（html タグがする）
    page(res, `${note.title} を直す`, html`
<h1>直す</h1>
<form method="post" action="/notes/${note.id}">
  <p><label>題名 <input name="title" value="${note.title}"></label></p>
  <p><label>メモ<br><textarea name="memo">${note.memo ?? ''}</textarea></label></p>
  <p><button disabled>保存（この練習問題では作らない）</button></p>
</form>`);
  });

const server = http.createServer(createApp(router.handle));
server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
process.on('SIGTERM', () => server.close());
