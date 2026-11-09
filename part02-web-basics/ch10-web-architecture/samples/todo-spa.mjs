// SPA（シングルページアプリケーション）版のタスク管理（第10章 3節・5節・8節）
// 使い方（~/dev/ch10 で）: node samples/todo-spa.mjs [ポート]   既定: 8501
//   中身は読まなくてよい（本文で書いた mini-spa.mjs を大きくしたもの）
//   サーバは「空の HTML と JavaScript」と「JSON の API」だけを返す。
//   画面は、ブラウザの JavaScript が API から JSON を取ってきて組み立てる。
//
//   GET    /api/tasks        一覧
//   POST   /api/tasks        追加（201 Created と Location）
//   GET    /api/tasks/:id    1件
//   PATCH  /api/tasks/:id    一部を変更（{"done": true} など）
//   DELETE /api/tasks/:id    削除（204 No Content）
//   GET    /app.js           画面の JavaScript
//   GET    それ以外          どのパスでも同じ HTML（画面の切り替えは JavaScript が行う）
import http from 'node:http';
import { listTasks, getTask, addTask, updateTask, deleteTask, validateTitle } from './tasks-store.mjs';

const port = Number(process.argv[2] ?? 8501);

const SHELL = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>タスク（SPA）</title>
<style>
  body { font-family: -apple-system, "Hiragino Sans", sans-serif; margin: 2rem; max-width: 40rem; }
  .done { text-decoration: line-through; color: #888; } .error { color: #cf222e; } li { margin: .4rem 0; }
</style>
<script type="module" src="/app.js"></script>
</head>
<body>
<p><a href="/" data-link>タスク（SPA 版）</a></p>
<main id="app"><p>読み込み中…</p></main>
<noscript><p>このページを表示するには JavaScript を有効にしてください。</p></noscript>
</body>
</html>
`;

// ブラウザで動く JavaScript（第8部では、ここを React で書く）
const APP_JS = String.raw`
const app = document.querySelector('#app');

// textContent を使って要素を作る（innerHTML に文字列を入れないので、エスケープを忘れても XSS にならない）
function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(data?.error ?? res.status + ' ' + res.statusText);
  return data;
}

async function renderList() {
  document.title = '一覧 - タスク（SPA）';
  const tasks = await api('GET', '/api/tasks');
  const error = el('p', { className: 'error' });
  const input = el('input', { name: 'title', placeholder: '新しいタスク', autofocus: true });
  const form = el('form', {}, input, ' ', el('button', {}, '追加'), error);
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // ブラウザにフォームを送信させず、自分で fetch する
    try {
      await api('POST', '/api/tasks', { title: input.value });
      await renderList();
    } catch (err) {
      error.textContent = err.message;
    }
  });

  const items = tasks.map((t) => {
    const link = el('a', { href: '/tasks/' + t.id, className: t.done ? 'done' : '' }, t.title);
    link.dataset.link = '';
    const toggle = el('button', {}, t.done ? '未完了に戻す' : '完了');
    toggle.addEventListener('click', () => api('PATCH', '/api/tasks/' + t.id, { done: !t.done }).then(renderList));
    const del = el('button', {}, '削除');
    del.addEventListener('click', () => api('DELETE', '/api/tasks/' + t.id).then(renderList));
    return el('li', {}, link, ' ', toggle, ' ', del);
  });
  app.replaceChildren(el('h1', {}, 'タスクの一覧'), form, el('ul', {}, ...(items.length ? items : [el('li', {}, 'タスクはありません')])));
}

async function renderDetail(id) {
  try {
    const t = await api('GET', '/api/tasks/' + id);
    document.title = t.title + ' - タスク（SPA）';
    const back = el('a', { href: '/' }, '← 一覧に戻る');
    back.dataset.link = '';
    app.replaceChildren(
      el('h1', { className: t.done ? 'done' : '' }, t.title),
      el('p', {}, '状態: ' + (t.done ? '完了' : '未完了')),
      el('p', {}, '作成: ' + new Date(t.createdAt).toLocaleString('ja-JP')),
      el('p', {}, back),
    );
  } catch {
    app.replaceChildren(el('h1', {}, '見つかりません'));
  }
}

// 今の URL を見て、どの画面を表示するか決める（クライアント側のルーティング）
function route() {
  const m = location.pathname.match(/^\/tasks\/(\d+)$/);
  return m ? renderDetail(m[1]) : renderList();
}

// data-link の付いたリンクは、ページを読み込み直さずに、URL だけを変えて画面を描き直す
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (!a || e.metaKey || e.ctrlKey) return; // ⌘ + クリック（新しいタブで開く）はブラウザに任せる
  e.preventDefault();
  history.pushState(null, '', a.href); // 履歴に追加する（戻るボタンで戻れるように）
  route();
});
addEventListener('popstate', route); // 戻る・進むボタン
route();
`;

function sendJson(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(data === undefined ? '' : `${JSON.stringify(data)}\n`);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  console.log(`${req.method} ${req.url}`);

  // ---- API ----
  if (pathname.startsWith('/api/')) {
    try {
      if (pathname === '/api/tasks') {
        if (req.method === 'GET') return sendJson(res, 200, listTasks());
        if (req.method === 'POST') {
          const { title } = await readJson(req);
          const error = validateTitle(title);
          if (error) return sendJson(res, 422, { error });
          const task = addTask(title);
          return sendJson(res, 201, task, { Location: `/api/tasks/${task.id}` });
        }
        return sendJson(res, 405, { error: 'このメソッドは使えません' }, { Allow: 'GET, POST' });
      }
      const m = pathname.match(/^\/api\/tasks\/(\d+)$/);
      if (m) {
        const id = Number(m[1]);
        if (req.method === 'GET') {
          const task = getTask(id);
          return task ? sendJson(res, 200, task) : sendJson(res, 404, { error: '見つかりません' });
        }
        if (req.method === 'PATCH') {
          const changes = await readJson(req);
          if (changes.title !== undefined) {
            const error = validateTitle(changes.title);
            if (error) return sendJson(res, 422, { error });
          }
          const task = updateTask(id, changes);
          return task ? sendJson(res, 200, task) : sendJson(res, 404, { error: '見つかりません' });
        }
        if (req.method === 'DELETE') {
          return deleteTask(id) ? sendJson(res, 204) : sendJson(res, 404, { error: '見つかりません' });
        }
        return sendJson(res, 405, { error: 'このメソッドは使えません' }, { Allow: 'GET, PATCH, DELETE' });
      }
      return sendJson(res, 404, { error: '見つかりません' });
    } catch (err) {
      return sendJson(res, 400, { error: `リクエストが正しくありません（${err.message}）` });
    }
  }

  // ---- 画面 ----
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'このメソッドは使えません' });
  if (pathname === '/app.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    return res.end(APP_JS);
  }
  // /、/tasks/2 など、API 以外のパスには、すべて同じ HTML を返す（SPA のフォールバック）
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  return res.end(SHELL);
});

server.listen(port, '127.0.0.1', () => console.log(`SPA 版: http://localhost:${port}/`));
