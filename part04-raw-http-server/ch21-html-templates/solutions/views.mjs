// 練習問題6の模範解答
import { html } from '../samples/mini-html.mjs';
import { attrs, queryString } from './html-helpers.mjs';

export function layout({ title, body, flash = null }) {
  // 修正: html タグで組み立てる。title・flash はエスケープされ、body（html タグの結果）はそのまま入る
  //       flash が無いときは null を入れる。html タグは null を何も出さない
  return html`<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | タスク</title>
</head>
<body>
  ${flash ? html`<p class="flash">${flash}</p>` : null}
  <main>${body}</main>
</body>
</html>`;
}

export function taskList(tasks) {
  if (tasks.length === 0) return html`<p class="empty">タスクはありません</p>`; // 追加
  // 修正: 中身も html タグにする（ふつうの文字列にすると、外側の html タグに丸ごとエスケープされる）
  return html`<ul class="tasks">${tasks.map((t) => html`<li${attrs({ class: { task: true, done: t.done } })}><a href="/tasks/${t.id}">${t.title}</a></li>`)}</ul>`;
}

export function paginate(all, { page = 1, perPage = 10 } = {}) {
  const total = all.length;
  const pages = Math.max(1, Math.ceil(total / perPage)); // 修正: 端数のページも数える。0件でも1ページ
  // 追加: 文字列の "2" も数にする。整数でなければ 1、範囲の外なら端のページ
  let n = Number(page);
  if (!Number.isInteger(n)) n = 1;
  n = Math.min(Math.max(n, 1), pages);
  const start = (n - 1) * perPage; // 修正: page は 1 から数える
  return { items: all.slice(start, start + perPage), page: n, pages, total, hasPrev: n > 1, hasNext: n < pages };
}

export function pagination({ page, pages, baseUrl, query = {} }) {
  if (pages <= 1) return html``; // 追加: 1ページだけなら出さない
  // 修正: ページ以外の条件を残し、URL 用にエンコードする（queryString）。& は html タグが &amp; にする
  const href = (n) => `${baseUrl}${queryString({ ...query, page: n })}`;
  const links = [];
  for (let i = 1; i <= pages; i++) { // 修正: 最後のページまで
    links.push(i === page ? html`<span aria-current="page">${i}</span>` : html`<a href="${href(i)}">${i}</a>`);
  }
  return html`<nav class="pagination">
  ${page > 1 ? html`<a href="${href(page - 1)}" rel="prev">前へ</a>` : null}
  ${links}
  ${page < pages ? html`<a href="${href(page + 1)}" rel="next">次へ</a>` : null}
</nav>`;
}
