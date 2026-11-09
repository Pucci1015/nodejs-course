// 練習問題6 用: 問題のある MPA 版のタスク管理
// 使い方: node bad-mpa.mjs [ポート]   既定: 8510
//   ブラウザで操作すると、一見ちゃんと動く。しかし、設計と実装に問題が4つある。
//   ~/dev/ch10 で cp exercises/bad-mpa.mjs fixed-mpa.mjs としてコピーを作り、直してから
//   bash exercises/check-mpa.sh fixed-mpa.mjs で確かめる。
import http from 'node:http';

const port = Number(process.argv[2] || 8510);

// タスクはメモリの中にだけある（サーバを止めると元に戻る）
const tasks = [
  { id: 1, title: '牛乳を買う', done: false },
  { id: 2, title: '第10章を読む', done: true },
];
let nextId = 3;

// id が一致するタスクを探す。無ければ undefined
function findTask(id) {
  for (const task of tasks) {
    if (task.id === id) return task;
  }
  return undefined;
}

// タイトルを検査する。問題があればエラーの文、無ければ空の文字列を返す
function validateTitle(title) {
  if (title === null || title.trim() === '') return 'タイトルを入力してください';
  if (title.trim().length > 100) return 'タイトルは100文字以内にしてください';
  return '';
}

// ページ全体の HTML を作る
function layout(title, body) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>${title} - タスク</title>
<style>.done { text-decoration: line-through; color: #888; } .error { color: #cf222e; } form.inline { display: inline; }</style>
</head>
<body>
<p><a href="/">タスク</a></p>
${body}
</body>
</html>
`;
}

// 一覧のページ。error と title は、入力に誤りがあったときに表示する文と、入力された値
function listPage(error, title) {
  let items = '';
  for (const task of tasks) {
    const cls = task.done ? 'done' : '';
    const label = task.done ? '未完了に戻す' : '完了';
    items += `<li>
  <a href="/tasks/${task.id}" class="${cls}">${task.title}</a>
  <form class="inline" method="post" action="/tasks/${task.id}/toggle"><button>${label}</button></form>
  <a href="/tasks/${task.id}/delete">削除</a>
</li>
`;
  }
  if (items === '') items = '<li>タスクはありません</li>\n';

  let errorHtml = '';
  if (error !== '') errorHtml = `<p class="error">${error}</p>`;

  return layout(
    '一覧',
    `<h1>タスクの一覧</h1>
<form method="post" action="/tasks">
  <input name="title" value="${title}" placeholder="新しいタスク">
  <button>追加</button>
  ${errorHtml}
</form>
<ul>
${items}</ul>`,
  );
}

function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function redirect(res, location) {
  res.writeHead(303, { Location: location });
  res.end();
}

const server = http.createServer((req, res) => {
  console.log(req.method, req.url);
  const pathname = new URL(req.url, 'http://localhost').pathname;
  // '/tasks/3/toggle' → ['', 'tasks', '3', 'toggle']
  const parts = pathname.split('/');
  const id = Number(parts[2]);

  // GET / … 一覧
  if (req.method === 'GET' && pathname === '/') {
    sendHtml(res, 200, listPage('', ''));
    return;
  }

  // GET /tasks/番号 … 1件の画面
  if (req.method === 'GET' && parts[1] === 'tasks' && parts.length === 3) {
    const task = findTask(id);
    const cls = task.done ? 'done' : '';
    const state = task.done ? '完了' : '未完了';
    sendHtml(res, 200, layout(task.title, `<h1 class="${cls}">${task.title}</h1>
<p>状態: ${state}</p>
<p><a href="/">← 一覧に戻る</a></p>`));
    return;
  }

  // POST /tasks … 追加
  if (req.method === 'POST' && pathname === '/tasks') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      const title = new URLSearchParams(body).get('title');
      const error = validateTitle(title);
      if (error !== '') {
        sendHtml(res, 422, listPage(error, title || ''));
        return;
      }
      tasks.push({ id: nextId, title: title.trim(), done: false });
      nextId++;
      sendHtml(res, 200, listPage('', ''));
    });
    return;
  }

  // POST /tasks/番号/toggle … 完了と未完了を切り替える
  if (req.method === 'POST' && parts[1] === 'tasks' && parts[3] === 'toggle' && parts.length === 4) {
    const task = findTask(id);
    task.done = !task.done;
    redirect(res, '/');
    return;
  }

  // GET /tasks/番号/delete … 削除
  if (req.method === 'GET' && parts[1] === 'tasks' && parts[3] === 'delete' && parts.length === 4) {
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) {
        tasks.splice(i, 1);
        break;
      }
    }
    redirect(res, '/');
    return;
  }

  sendHtml(res, 404, layout('見つかりません', '<h1>見つかりません</h1>'));
});

server.listen(port, '127.0.0.1', () => console.log(`問題のある MPA 版: http://localhost:${port}/`));
