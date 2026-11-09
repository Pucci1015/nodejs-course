// 練習問題7 用: CORS に対応していない、タスクの API（8401番）
// 使い方: node exercises/api-server.mjs        画面は exercises/front-server.mjs（http://localhost:8400/）
// このファイルを ~/dev/ch09/cors-api-server.mjs にコピーして、CORS に対応させる。
//
//   GET    /api/tasks       タスクの一覧
//   POST   /api/tasks       タスクを追加（ボディは JSON: {"title": "..."}）
//   DELETE /api/tasks/番号  タスクを削除
//   GET    /api/me          Cookie の user を返す（/api/login で Cookie を作る）
//   GET    /api/login       Cookie（user=alice）を作る。ブラウザで直接開く
import http from 'node:http';

const tasks = [
  { id: 1, title: '牛乳を買う' },
  { id: 2, title: '第9章を読む' },
];
let nextId = 3;

// JSON で返す。data が無ければボディなし（204 のとき）
function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(data === undefined ? '' : `${JSON.stringify(data)}\n`);
}

// 第7章3.2節の parseCookies と同じ
function parseCookies(header) {
  const cookies = {};
  if (header === undefined) return cookies;
  for (const part of header.split('; ')) {
    const [name, value] = part.split('=');
    cookies[name] = value;
  }
  return cookies;
}

// ボディを受け取った後に呼ばれる。パスとメソッドで分ける
function handle(req, res, pathname, body) {
  if (pathname === '/api/tasks' && req.method === 'GET') {
    sendJson(res, 200, tasks);
    return;
  }
  if (pathname === '/api/tasks' && req.method === 'POST') {
    let title;
    try {
      title = JSON.parse(body).title;
    } catch {
      sendJson(res, 400, { error: 'JSON が正しくありません' });
      return;
    }
    if (typeof title !== 'string' || title.trim() === '') {
      sendJson(res, 422, { error: 'title が必要です' });
      return;
    }
    const task = { id: nextId, title: title.trim() };
    nextId++;
    tasks.push(task);
    sendJson(res, 201, task);
    return;
  }
  if (pathname.startsWith('/api/tasks/') && req.method === 'DELETE') {
    const id = Number(pathname.slice('/api/tasks/'.length)); // '/api/tasks/2' → 2
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) {
        tasks.splice(i, 1); // i 番目から1つ取り除く
        sendJson(res, 204);
        return;
      }
    }
    sendJson(res, 404, { error: '見つかりません' });
    return;
  }
  if (pathname === '/api/me' && req.method === 'GET') {
    const cookies = parseCookies(req.headers.cookie);
    sendJson(res, 200, { user: cookies.user ?? null });
    return;
  }
  if (pathname === '/api/login' && req.method === 'GET') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Set-Cookie', 'user=alice; Path=/; HttpOnly; SameSite=Lax');
    res.end('ログインしました（user=alice）\n');
    return;
  }
  sendJson(res, 404, { error: '見つかりません' });
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname; // クエリを除いたパス
  console.log(`${req.method} ${pathname}  Origin: ${req.headers.origin ?? '（なし）'}`);
  let body = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    handle(req, res, pathname, body);
  });
});

server.listen(8401, '127.0.0.1', () => {
  console.log('API: http://localhost:8401/api/tasks');
});
