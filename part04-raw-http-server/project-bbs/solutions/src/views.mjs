// 画面（第21章の html タグと部品の関数）
import { html } from './lib/mini-html.mjs';
import { attrs } from './lib/html-helpers.mjs';
import { pagination } from './lib/pagination.mjs';

const fmt = new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tokyo' });
const time = (iso) => html`<time datetime="${iso}">${fmt.format(new Date(iso))}</time>`;

/** CSRF トークンを隠して入れる */
const csrfField = (csrf) => html`<input type="hidden" name="csrf" value="${csrf}">`;

/** 入力欄の下の、間違いの説明 */
const fieldError = (msg) => (msg ? html`<p class="error">${msg}</p>` : null);

export function layout({ title, body, user, csrf, flash }) {
  return html`<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | 簡易掲示板</title>
  <link rel="stylesheet" href="/static/style.css">
</head>
<body>
<header class="site">
  <a class="brand" href="/">簡易掲示板</a>
  <nav>
    ${user
      ? html`<span class="me">${user.name}</span>
    <form method="post" action="/logout" class="inline">${csrfField(csrf)}<button>ログアウト</button></form>`
      : html`<a href="/login">ログイン</a> <a href="/signup">登録</a>`}
  </nav>
</header>
<main>
${flash ? html`<p class="flash">${flash}</p>` : null}
${body}
</main>
</body>
</html>`;
}

export function threadListPage({ page, user }) {
  return html`<h1>スレッドの一覧</h1>
${user ? html`<p><a class="button" href="/threads/new">スレッドを立てる</a></p>` : html`<p>書き込むには <a href="/login">ログイン</a> してください。</p>`}
${page.items.length === 0
    ? html`<p class="empty">まだスレッドはありません</p>`
    : html`<ul class="threads">${page.items.map((t) => html`<li>
  <a href="/threads/${t.id}">${t.title}</a>
  <small>${t.author} ・ ${t.postCount} 件 ・ ${time(t.updatedAt)}</small>
</li>`)}</ul>`}
${pagination({ page: page.page, pages: page.pages, baseUrl: '/' })}`;
}

function postItem(p, { user, csrf, threadId }) {
  return html`<article${attrs({ class: { post: true, deleted: p.deleted }, id: `post-${p.id}` })}>
  <header><a href="#post-${p.id}">#${p.id}</a> <strong>${p.author}</strong> ${time(p.createdAt)}</header>
  ${p.deleted ? html`<p class="body"><em>この投稿は削除されました</em></p>` : html`<p class="body">${p.body}</p>`}
  ${!p.deleted && user && user.id === p.userId
    ? html`<form method="post" action="/posts/${p.id}/delete" class="inline">${csrfField(csrf)}<input type="hidden" name="thread" value="${threadId}"><button>削除</button></form>`
    : null}
</article>`;
}

export function threadPage({ thread, user, csrf, values = {}, errors = {} }) {
  return html`<h1>${thread.title}</h1>
<p><small>${thread.author} が ${time(thread.createdAt)} に立てたスレッド ・ ${thread.posts.length} 件</small></p>
${thread.posts.map((p) => postItem(p, { user, csrf, threadId: thread.id }))}
${user
    ? html`<form method="post" action="/threads/${thread.id}/posts" class="card">
  ${csrfField(csrf)}
  <p><label>返信<br><textarea name="body" rows="4" maxlength="2000" required>${values.body ?? ''}</textarea></label></p>
  ${fieldError(errors.body)}
  <p><button>書き込む</button></p>
</form>`
    : html`<p>返信するには <a href="/login">ログイン</a> してください。</p>`}
<p><a href="/">一覧へ戻る</a></p>`;
}

export function newThreadPage({ csrf, values = {}, errors = {} }) {
  return html`<h1>スレッドを立てる</h1>
<form method="post" action="/threads" class="card">
  ${csrfField(csrf)}
  <p><label>題名<br><input name="title" value="${values.title ?? ''}" maxlength="100" required></label></p>
  ${fieldError(errors.title)}
  <p><label>本文<br><textarea name="body" rows="6" maxlength="2000" required>${values.body ?? ''}</textarea></label></p>
  ${fieldError(errors.body)}
  <p><button>立てる</button></p>
</form>`;
}

export function signupPage({ csrf, values = {}, errors = {} }) {
  return html`<h1>登録</h1>
<form method="post" action="/signup" class="card">
  ${csrfField(csrf)}
  <p><label>名前（英数字と _ で 3〜20 文字）<br><input name="name" value="${values.name ?? ''}" autocomplete="username" required></label></p>
  ${fieldError(errors.name)}
  <p><label>パスワード（8 文字以上）<br><input name="password" type="password" autocomplete="new-password" required></label></p>
  ${fieldError(errors.password)}
  <p><button>登録する</button></p>
</form>
<p>登録済みなら <a href="/login">ログイン</a></p>`;
}

export function loginPage({ csrf, values = {} }) {
  return html`<h1>ログイン</h1>
<form method="post" action="/login" class="card">
  ${csrfField(csrf)}
  <p><label>名前<br><input name="name" value="${values.name ?? ''}" autocomplete="username" required></label></p>
  <p><label>パスワード<br><input name="password" type="password" autocomplete="current-password" required></label></p>
  <p><button>ログイン</button></p>
</form>
<p>はじめてなら <a href="/signup">登録</a></p>`;
}

export function errorPage({ status, message }) {
  return html`<h1>${status}</h1><p>${message}</p><p><a href="/">一覧へ戻る</a></p>`;
}
