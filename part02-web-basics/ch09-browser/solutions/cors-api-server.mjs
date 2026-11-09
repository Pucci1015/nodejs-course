// 練習問題7 の模範解答: api-server.mjs を CORS に対応させたもの。足したところには「追加:」のコメントがある
// 使い方: node solutions/cors-api-server.mjs        確かめ方: bash exercises/check-cors.sh
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

// 追加: CORS の設定
const ALLOWED_ORIGINS = ['http://localhost:8400', 'http://127.0.0.1:8400'];
const ALLOWED_METHODS = ['GET', 'POST', 'DELETE'];

// 追加: すべてのレスポンスに付ける CORS のヘッダ
function setCors(req, res) {
  // Origin によって返すヘッダが変わるので、許可するかどうかに関係なく Vary: Origin を付ける
  res.setHeader('Vary', 'Origin');
  const origin = req.headers.origin;
  // 一覧と完全に一致するときだけ許可する（startsWith で比べると、
  // http://localhost:8400.evil.example のようなオリジンを通してしまう）
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin); // * ではなく、具体的なオリジンを返す
    res.setHeader('Access-Control-Allow-Credentials', 'true'); // /api/me を Cookie 付きで読ませるため
  }
}

// 追加: プリフライトで頼まれたヘッダが、すべて Content-Type だけか（'content-type' や '' なら true）
function headersAllowed(requested) {
  if (requested === undefined) return true;
  for (const name of requested.split(',')) {
    const h = name.trim().toLowerCase();
    if (h !== '' && h !== 'content-type') return false;
  }
  return true;
}

// 追加: プリフライト（OPTIONS）に答える
function handlePreflight(req, res) {
  const origin = req.headers.origin;
  const method = req.headers['access-control-request-method'];
  const ok = ALLOWED_ORIGINS.includes(origin) && ALLOWED_METHODS.includes(method) && headersAllowed(req.headers['access-control-request-headers']);
  if (!ok) {
    // 許可しないときは CORS のヘッダを付けない。ブラウザは本番のリクエストを送らない
    res.statusCode = 403;
    res.setHeader('Vary', 'Origin');
    res.end();
    return;
  }
  setCors(req, res);
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '600'); // この答えを600秒覚えておいてよい
  res.statusCode = 204;
  res.end();
}

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
  // 追加: プリフライトは、どのパスでも先に処理する
  if (req.method === 'OPTIONS') {
    handlePreflight(req, res);
    return;
  }
  // 追加: エラーのレスポンスにも付ける（付けないと、画面の JavaScript からはエラーの中身が読めない）
  setCors(req, res);

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
