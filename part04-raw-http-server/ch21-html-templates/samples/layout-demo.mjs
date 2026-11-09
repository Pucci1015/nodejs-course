// 関数を部品にして、ページを組み立てる（第21章 5節）
// 使い方: node layout-demo.mjs   → ブラウザで http://127.0.0.1:9211/ と /tasks/1
import http from 'node:http';
import { createApp, HttpError } from '../../ch17-minimal-server/solutions/app.mjs';
import { sendHtml } from '../../ch17-minimal-server/solutions/send.mjs';
import { Router } from '../../ch18-routing/solutions/router.mjs';
import { html } from './mini-html.mjs';

const PORT = 9211;
const tasks = [
  { id: 1, title: '牛乳を買う', done: false, tags: ['買い物'] },
  { id: 2, title: '第21章を読む', done: true, tags: ['勉強', 'node'] },
  { id: 3, title: 'Tom & Jerry を見る', done: false, tags: [] },
];

// 全部のページで共通の外側（Jinja2 の {% extends "base.html" %} にあたる）
function layout({ title, body }) {
  return html`<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | タスク</title>
</head>
<body>
  <header><a href="/">タスク</a></header>
  <main>${body}</main>
  <footer><small>第21章のサンプル</small></footer>
</body>
</html>`;
}

// 小さな部品（Jinja2 の {% include %} やマクロにあたる）
const tagList = (tags) => (tags.length === 0 ? html`<small>タグなし</small>` : html`<ul class="tags">${tags.map((t) => html`<li>${t}</li>`)}</ul>`);

function taskItem(task) {
  return html`<li>
    <a href="/tasks/${task.id}">${task.title}</a>
    ${task.done ? html`<strong>（完了）</strong>` : null}
  </li>`;
}

const router = new Router()
  .get('/', (req, res) => sendHtml(res, 200, String(layout({
    title: '一覧',
    body: html`<h1>タスクの一覧</h1><ul>${tasks.map(taskItem)}</ul>`,
  }))))
  .get('/tasks/:id', (req, res, { id }) => {
    const task = tasks.find((t) => String(t.id) === id);
    if (!task) throw new HttpError(404, 'ありません');
    sendHtml(res, 200, String(layout({
      title: task.title,
      body: html`<h1>${task.title}</h1><p>${task.done ? '完了しました' : 'まだです'}</p>${tagList(task.tags)}`,
    })));
  });

http.createServer(createApp(router.handle)).listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
