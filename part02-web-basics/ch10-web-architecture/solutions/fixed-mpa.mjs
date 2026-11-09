// 練習問題6 の解答: bad-mpa.mjs の4つの問題を直したもの（変えた所に「直した」と書いた）
// 使い方: node solutions/fixed-mpa.mjs [ポート]   既定: 8510
// 確かめ方（~/dev/ch10 で）: bash exercises/check-mpa.sh solutions/fixed-mpa.mjs
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

// 直した（問題3）: HTML の中で特別な意味を持つ文字を置き換える。
//   " も置き換えるので、value="..." の中に入れても属性から抜け出せない
function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// ページ全体の HTML を作る
function layout(title, body) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)} - タスク</title>
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
  <a href="/tasks/${task.id}" class="${cls}">${escapeHtml(task.title)}</a>
  <form class="inline" method="post" action="/tasks/${task.id}/toggle"><button>${label}</button></form>
  <form class="inline" method="post" action="/tasks/${task.id}/delete"><button>削除</button></form>
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
  <input name="title" value="${escapeHtml(title)}" placeholder="新しいタスク">
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

// 直した: 使えないメソッドには 405 と、使えるメソッドの一覧（Allow）を返す
function methodNotAllowed(res, allow) {
  res.writeHead(405, { 'Content-Type': 'text/html; charset=utf-8', Allow: allow });
  res.end(layout('使えないメソッド', '<h1>このメソッドは使えません</h1>'));
}

function notFound(res) {
  sendHtml(res, 404, layout('見つかりません', '<h1>見つかりません</h1>'));
}

function redirect(res, location) {
  res.writeHead(303, { Location: location });
  res.end();
}

// 直した（問題4 の守り）: リクエストを処理する関数を分けて、try/catch で包む（下の createServer）
function handle(req, res) {
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
    if (task === undefined) {
      notFound(res); // 直した（問題4）: 無いタスクは 404
      return;
    }
    const cls = task.done ? 'done' : '';
    const state = task.done ? '完了' : '未完了';
    sendHtml(res, 200, layout(task.title, `<h1 class="${cls}">${escapeHtml(task.title)}</h1>
<p>状態: ${state}</p>
<p><a href="/">← 一覧に戻る</a></p>`));
    return;
  }

  // 直した: GET /tasks は 405（追加は POST だけ）
  if (pathname === '/tasks' && req.method !== 'POST') {
    methodNotAllowed(res, 'POST');
    return;
  }

  // POST /tasks … 追加
  if (req.method === 'POST' && pathname === '/tasks') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      // 直した: 'end' の関数は handle の外で呼ばれるので、ここでも try/catch で包む
      try {
        addTask(res, body);
      } catch (err) {
        serverError(res, err);
      }
    });
    return;
  }

  // POST /tasks/番号/toggle … 完了と未完了を切り替える
  if (req.method === 'POST' && parts[1] === 'tasks' && parts[3] === 'toggle' && parts.length === 4) {
    const task = findTask(id);
    if (task === undefined) {
      notFound(res); // 直した（問題4）
      return;
    }
    task.done = !task.done;
    redirect(res, '/');
    return;
  }

  // 直した（問題2）: 削除は POST /tasks/番号/delete。GET では消さずに 405
  if (parts[1] === 'tasks' && parts[3] === 'delete' && parts.length === 4) {
    if (req.method !== 'POST') {
      methodNotAllowed(res, 'POST');
      return;
    }
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) {
        tasks.splice(i, 1);
        redirect(res, '/');
        return;
      }
    }
    notFound(res); // 直した（問題4）: 無いタスクは 404
    return;
  }

  notFound(res);
}

// 追加の処理（'end' の中から呼ぶ）
function addTask(res, body) {
  const title = new URLSearchParams(body).get('title');
  const error = validateTitle(title);
  if (error !== '') {
    sendHtml(res, 422, listPage(error, title || ''));
    return;
  }
  tasks.push({ id: nextId, title: title.trim(), done: false });
  nextId++;
  redirect(res, '/'); // 直した（問題1）: PRG。結果の HTML を直接返さず、303 で一覧へ
}

// 思わぬ例外が起きたときは、サーバを止めずに 500 を返す
function serverError(res, err) {
  console.error(err);
  if (!res.headersSent) {
    sendHtml(res, 500, layout('エラー', '<h1>サーバでエラーが起きました</h1>'));
  }
}

const server = http.createServer((req, res) => {
  console.log(req.method, req.url);
  try {
    handle(req, res);
  } catch (err) {
    serverError(res, err);
  }
});

server.listen(port, '127.0.0.1', () => console.log(`直した MPA 版: http://localhost:${port}/`));
