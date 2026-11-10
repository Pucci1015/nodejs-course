// 第18章 2節で書く、if 文を並べたタスクの API の完成形
// 使い方（~/dev/part04/ch18-routing で）: node samples/tasks-if.mjs
//   別のターミナルで: curl -i http://127.0.0.1:9183/api/tasks
//                     curl -i http://127.0.0.1:9183/api/tasks/2
//                     curl -i -X DELETE http://127.0.0.1:9183/api/tasks/2   → 404（本当は 405 にしたい）
import http from 'node:http';

const PORT = 9183;
const tasks = [
  { id: 1, title: '牛乳を買う' },
  { id: 2, title: '第18章を読む' },
];

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(`http://localhost${req.url}`);

  if (req.method === 'GET' && pathname === '/api/tasks') {
    return sendJson(res, 200, tasks);
  }
  const m = /^\/api\/tasks\/(\d+)$/.exec(pathname); // ^ と $ で、全体があてはまることを求める
  if (req.method === 'GET' && m) {
    const task = tasks.find((t) => t.id === Number(m[1]));
    return task ? sendJson(res, 200, task) : sendJson(res, 404, { error: 'ありません' });
  }
  return sendJson(res, 404, { error: 'ありません' });
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/api/tasks で待っています（Ctrl+C で止める）`));
