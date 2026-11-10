// ページ分け（第21章 練習問題6の模範解答 views.mjs から、paginate と pagination だけを取り出したもの）
import { html } from './mini-html.mjs';
import { queryString } from './html-helpers.mjs';

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
