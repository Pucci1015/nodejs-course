// 練習問題8 の解答: POST /api/tasks を Idempotency-Key に対応させたもの（変えた所に「追加」と書いた）
// 使い方: node solutions/idempotent-api.mjs [ポート]   既定: 8520（環境変数 DELAY_MS は slow-api.mjs と同じ）
// 確かめ方（~/dev/ch10 で）: bash exercises/check-idempotency.sh solutions/idempotent-api.mjs
import http from 'node:http';

const port = Number(process.argv[2] || 8520);
const DELAY_MS = Number(process.env.DELAY_MS || 300);

const tasks = [];
let nextId = 1;

// 追加: 冪等キーの記録。Map は「キー → 値」の表で、get・set・delete で読み書きする
//   値は { state: 'processing'（処理中）または 'done'（済み）, body: 受け取ったボディ, task: 作ったタスク }
//   本物のアプリでは、複数のプロセスから見えるように、データベースなどに保存する（第6部）
const records = new Map();

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data) + '\n');
}

function validate(input) {
  if (typeof input !== 'object' || input === null) return 'JSON のオブジェクトを送ってください';
  if (typeof input.title !== 'string' || input.title.trim() === '') return 'タイトルを入力してください';
  if (input.title.trim().length > 100) return 'タイトルは100文字以内にしてください';
  return '';
}

// 追加: キーが「空白を含まない表示できる ASCII（! から ~）で 1〜255 文字」かを調べる
function isValidKey(key) {
  if (key.length < 1 || key.length > 255) return false;
  for (let i = 0; i < key.length; i++) {
    const code = key.charCodeAt(i); // '!' は 33、'~' は 126
    if (code < 33 || code > 126) return false;
  }
  return true;
}

// key は、キーが無いときは undefined
function createTask(res, body, key) {
  let input;
  try {
    input = JSON.parse(body);
  } catch (err) {
    sendJson(res, 400, { error: 'JSON として読めません（' + err.message + '）' });
    return; // 入力の誤りなので、キーは記録しない
  }
  const error = validate(input);
  if (error !== '') {
    sendJson(res, 422, { error: error });
    return; // 入力の誤りなので、キーは記録しない
  }

  // 追加: 待つ（setTimeout）「前に」処理中の印を付ける。
  //   ここで印を付けないと、保存を待っている間に届いた同じキーのリクエストも、記録が無いので処理されてしまう
  if (key !== undefined) {
    records.set(key, { state: 'processing', body: body });
  }

  setTimeout(() => {
    const task = { id: nextId, title: input.title.trim(), done: false };
    nextId++;
    tasks.push(task);
    console.log(`  → 保存しました: id ${task.id}「${task.title}」`);
    if (key !== undefined) {
      records.set(key, { state: 'done', body: body, task: task }); // 追加: 結果を記録する
    }
    res.setHeader('Location', '/api/tasks/' + task.id);
    sendJson(res, 201, task);
  }, DELAY_MS);
}

// 追加: キーが付いた POST の処理
function createWithKey(res, body, key) {
  if (!isValidKey(key)) {
    sendJson(res, 400, { error: 'Idempotency-Key は、空白を含まない 1〜255 文字の ASCII にしてください' });
    return;
  }

  const record = records.get(key);
  if (record === undefined) {
    createTask(res, body, key); // 1回目
    return;
  }
  if (record.body !== body) {
    sendJson(res, 422, { error: 'この Idempotency-Key は、別の内容のリクエストで使われています' });
    return;
  }
  if (record.state === 'processing') {
    sendJson(res, 409, { error: '同じ Idempotency-Key のリクエストを処理中です。少し待ってから送り直してください' });
    return;
  }
  // 2回目以降: 処理をせず、1回目の結果をそのまま返す
  res.setHeader('Idempotent-Replayed', 'true');
  res.setHeader('Location', '/api/tasks/' + record.task.id);
  sendJson(res, 201, record.task);
}

const server = http.createServer((req, res) => {
  const key = req.headers['idempotency-key'];
  console.log(req.method, req.url, key || '');

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
    if (key === undefined) {
      createTask(res, body, undefined); // キーが無ければ、今までどおり（毎回作る）
    } else {
      createWithKey(res, body, key);
    }
  });
});

server.listen(port, '127.0.0.1', () => console.log(`冪等キーに対応した API（保存に ${DELAY_MS}ms）: http://localhost:${port}/api/tasks`));
