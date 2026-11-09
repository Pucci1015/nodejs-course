// 練習問題8 用: タスクを追加する API。保存に時間がかかる（データベースへの書き込みを想定）
// 使い方: node slow-api.mjs [ポート]   既定: 8520
//   環境変数 DELAY_MS で、保存にかかる時間（ミリ秒）を変えられる。既定は 300
//   ~/dev/ch10 で cp exercises/slow-api.mjs idempotent-api.mjs としてコピーを作り、Idempotency-Key に対応させる。
//
//   GET  /api/tasks   一覧
//   POST /api/tasks   追加（201 Created と Location）
import http from 'node:http';

const port = Number(process.argv[2] || 8520);
const DELAY_MS = Number(process.env.DELAY_MS || 300);

// タスクはメモリの中にだけある（サーバを止めると空に戻る）
const tasks = [];
let nextId = 1;

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data) + '\n');
}

// 受け取った JSON を検査する。問題があればエラーの文、無ければ空の文字列を返す
function validate(input) {
  if (typeof input !== 'object' || input === null) return 'JSON のオブジェクトを送ってください';
  if (typeof input.title !== 'string' || input.title.trim() === '') return 'タイトルを入力してください';
  if (input.title.trim().length > 100) return 'タイトルは100文字以内にしてください';
  return '';
}

// タスクを作る。保存に DELAY_MS ミリ秒かかる、という想定で setTimeout で待ってから返事をする
function createTask(res, body) {
  let input;
  try {
    input = JSON.parse(body);
  } catch (err) {
    sendJson(res, 400, { error: 'JSON として読めません（' + err.message + '）' });
    return;
  }
  const error = validate(input);
  if (error !== '') {
    sendJson(res, 422, { error: error });
    return;
  }

  setTimeout(() => {
    const task = { id: nextId, title: input.title.trim(), done: false };
    nextId++;
    tasks.push(task);
    console.log(`  → 保存しました: id ${task.id}「${task.title}」`);
    res.setHeader('Location', '/api/tasks/' + task.id); // writeHead の前に setHeader で足したヘッダも送られる
    sendJson(res, 201, task);
  }, DELAY_MS);
}

const server = http.createServer((req, res) => {
  console.log(req.method, req.url, req.headers['idempotency-key'] || '');

  if (req.url !== '/api/tasks') {
    sendJson(res, 404, { error: '見つかりません' });
    return;
  }
  if (req.method === 'GET') {
    sendJson(res, 200, tasks);
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    sendJson(res, 405, { error: 'このメソッドは使えません' });
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    createTask(res, body);
  });
});

server.listen(port, '127.0.0.1', () => console.log(`タスクの API（保存に ${DELAY_MS}ms）: http://localhost:${port}/api/tasks`));
