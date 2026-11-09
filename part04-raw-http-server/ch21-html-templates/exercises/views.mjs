// 練習問題3: タスク一覧のページを、部品の関数で組み立てる
// テスト: node --test views.test.mjs
// 問題2の attrs・queryString を使ってよい（自分の解答を import するか、../solutions/html-helpers.mjs を使う）
import { html } from '../samples/mini-html.mjs';

/** ページ全体の外側。flash（「保存しました」などの知らせ）は、あるときだけ出す */
export function layout({ title, body, flash = null }) {
  // ここを書く（いまは、文字列をつないでいる。charset も無い）
  return '<!doctype html><html><head><title>' + title + '</title></head><body>'
    + '<p class="flash">' + flash + '</p><main>' + body + '</main></body></html>';
}

/** タスクの一覧。完了したものは class="task done"。1件も無ければ「タスクはありません」 */
export function taskList(tasks) {
  // ここを書く
  return html`<ul class="tasks">${tasks.map((t) => `<li class="task"><a href="/tasks/${t.id}">${t.title}</a></li>`)}</ul>`;
}

/**
 * 配列から、あるページのぶんだけを取り出す
 *   page は 1 から。数字でない・範囲の外なら、いちばん近いページにする
 *   返す値: { items, page, pages, total, hasPrev, hasNext }。pages は 1 以上
 */
export function paginate(all, { page = 1, perPage = 10 } = {}) {
  // ここを書く（いまは、ずれている）
  const pages = Math.floor(all.length / perPage);
  const items = all.slice(page * perPage, page * perPage + perPage);
  return { items, page, pages, total: all.length, hasPrev: page > 0, hasNext: page < pages };
}

/**
 * ページの番号のリンク。今のページは <span aria-current="page">、ほかは <a href>
 *   baseUrl: '/tasks'、query: { q: '牛乳' } のような、ページ以外の条件（リンクに残す）
 */
export function pagination({ page, pages, baseUrl, query = {} }) {
  // ここを書く
  let out = '<nav class="pagination">';
  for (let i = 1; i < pages; i++) out += `<a href="${baseUrl}?page=${i}">${i}</a>`;
  return out + '</nav>';
}
