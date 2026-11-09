// MPA（マルチページアプリケーション）版のタスク管理（第10章 2節・7節・8節）
// 使い方（~/dev/ch10 で）: node samples/todo-mpa.mjs [ポート]   既定: 8500
//   中身は読まなくてよい（本文で書いた mini-mpa.mjs を大きくしたもの）
//   サーバが画面ごとに HTML を作って返す。JavaScript は1行も使わない。
//   フォームの送信の後は 303 でリダイレクトする（PRG パターン）。
import http from 'node:http';
import { listTasks, getTask, addTask, updateTask, deleteTask, validateTitle } from './tasks-store.mjs';

const port = Number(process.argv[2] ?? 8500);

/** HTML の中に文字列を入れるときは、必ずエスケープする（第4部 第21章で詳しく） */
function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function layout(title, body) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)} - タスク（MPA）</title>
<style>
  body { font-family: -apple-system, "Hiragino Sans", sans-serif; margin: 2rem; max-width: 40rem; }
  .done { text-decoration: line-through; color: #888; } .error { color: #cf222e; }
  form.inline { display: inline; } li { margin: .4rem 0; }
</style>
</head>
<body>
<p><a href="/">タスク（MPA 版）</a></p>
${body}
</body>
</html>
`;
}

function listPage({ error = '', title = '' } = {}) {
  const items = listTasks()
    .map(
      (t) => `<li>
  <a href="/tasks/${t.id}" class="${t.done ? 'done' : ''}">${escapeHtml(t.title)}</a>
  <form class="inline" method="post" action="/tasks/${t.id}/toggle"><button>${t.done ? '未完了に戻す' : '完了'}</button></form>
  <form class="inline" method="post" action="/tasks/${t.id}/delete"><button>削除</button></form>
</li>`,
    )
    .join('\n');
  return layout(
    '一覧',
    `<h1>タスクの一覧</h1>
<form method="post" action="/tasks">
  <input name="title" value="${escapeHtml(title)}" placeholder="新しいタスク" autofocus>
  <button>追加</button>
  ${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}
</form>
<ul>
${items || '<li>タスクはありません</li>'}
</ul>`,
  );
}

function detailPage(task) {
  return layout(
    task.title,
    `<h1 class="${task.done ? 'done' : ''}">${escapeHtml(task.title)}</h1>
<p>状態: ${task.done ? '完了' : '未完了'}</p>
<p>作成: ${escapeHtml(new Date(task.createdAt).toLocaleString('ja-JP'))}</p>
<p><a href="/">← 一覧に戻る</a></p>`,
  );
}

function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

/** フォームの送信（application/x-www-form-urlencoded）のボディを読む */
async function readForm(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}

/** 303 See Other: 「結果は別の URL を GET して見て」 */
function seeOther(res, location) {
  res.writeHead(303, { Location: location });
  res.end();
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  console.log(`${req.method} ${req.url}`);

  if (req.method === 'GET' && pathname === '/') return sendHtml(res, 200, listPage());

  const detail = pathname.match(/^\/tasks\/(\d+)$/);
  if (req.method === 'GET' && detail) {
    const task = getTask(Number(detail[1]));
    return task ? sendHtml(res, 200, detailPage(task)) : sendHtml(res, 404, layout('見つかりません', '<h1>見つかりません</h1>'));
  }

  // ---- 状態を変える操作は、すべて POST で受け付ける（GET では決して変えない。本文6節）----
  if (req.method === 'POST' && pathname === '/tasks') {
    const title = (await readForm(req)).get('title') ?? '';
    const error = validateTitle(title);
    // 入力に誤りがあるときは、リダイレクトせずに、入力した値とエラーを付けてフォームを返す
    if (error) return sendHtml(res, 422, listPage({ error, title }));
    addTask(title);
    return seeOther(res, '/'); // PRG: POST の結果を直接返さず、一覧へ 303 でリダイレクト
  }

  const action = pathname.match(/^\/tasks\/(\d+)\/(toggle|delete)$/);
  if (req.method === 'POST' && action) {
    await readForm(req);
    const id = Number(action[1]);
    const task = getTask(id);
    if (!task) return sendHtml(res, 404, layout('見つかりません', '<h1>見つかりません</h1>'));
    if (action[2] === 'toggle') updateTask(id, { done: !task.done });
    else deleteTask(id);
    return seeOther(res, '/');
  }

  // パスはあるがメソッドが違うときは 405、どちらも無ければ 404
  if (pathname === '/tasks' || action) {
    res.writeHead(405, { Allow: 'POST', 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('このメソッドは使えません\n');
  }
  return sendHtml(res, 404, layout('見つかりません', '<h1>見つかりません</h1>'));
});

server.listen(port, '127.0.0.1', () => console.log(`MPA 版: http://localhost:${port}/`));
