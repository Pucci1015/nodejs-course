// 練習問題7 用: API（http://localhost:8401）を使う画面を配信するサーバ（8400番。中身は読まなくてよい）
// 使い方: node exercises/front-server.mjs   → ブラウザで http://localhost:8400/ を開く
// このファイルは変更しない。CORS の対応は API の側で行う。
import http from 'node:http';

const API = 'http://localhost:8401';

const page = `<!doctype html>
<html lang="ja">
<head><meta charset="utf-8"><title>タスク（CORS の練習）</title>
<style>body { font-family: -apple-system, "Hiragino Sans", sans-serif; margin: 2rem; } .error { color: #cf222e; }</style>
</head>
<body>
<h1>タスク</h1>
<p>画面のオリジン: <b>http://localhost:8400</b> ／ API のオリジン: <b>${API}</b></p>
<p id="me">ログイン状態: 確認中…</p>
<p>Cookie の確認には、先に <a href="${API}/api/login" target="_blank">${API}/api/login</a> を開いてください。</p>
<form id="add"><input name="title" placeholder="新しいタスク" required> <button>追加</button></form>
<ul id="list"></ul>
<p id="error" class="error"></p>
<script type="module">
  const showError = (err) => { document.querySelector('#error').textContent = 'エラー: ' + err.message + '（Console を見る）'; };

  async function load() {
    const res = await fetch('${API}/api/tasks');
    const tasks = await res.json();
    const list = document.querySelector('#list');
    list.replaceChildren(...tasks.map((t) => {
      const li = document.createElement('li');
      li.textContent = t.title + ' ';
      const del = document.createElement('button');
      del.textContent = '削除';
      del.addEventListener('click', () => fetch('${API}/api/tasks/' + t.id, { method: 'DELETE' }).then(load).catch(showError));
      li.append(del);
      return li;
    }));
  }

  document.querySelector('#add').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = new FormData(e.target).get('title');
    try {
      await fetch('${API}/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // JSON なので、プリフライトが必要になる
        body: JSON.stringify({ title }),
      });
      e.target.reset();
      await load();
    } catch (err) { showError(err); }
  });

  fetch('${API}/api/me', { credentials: 'include' })
    .then((r) => r.json())
    .then(({ user }) => { document.querySelector('#me').textContent = 'ログイン状態: ' + (user ?? 'ログインしていない'); })
    .catch(showError);

  load().catch(showError);
</script>
</body>
</html>
`;

http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(page);
  })
  .listen(8400, '127.0.0.1', () => console.log('画面: http://localhost:8400/'));
