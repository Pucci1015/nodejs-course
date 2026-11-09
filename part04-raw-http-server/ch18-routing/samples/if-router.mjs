// if 文を並べたルーティング（第18章 2節）
// 使い方: node if-router.mjs   → curl -i http://127.0.0.1:9180/api/tasks
// 小さいうちは読みやすいが、ルートが増えると、順番・メソッド・404 と 405 の区別が崩れていく
import http from 'node:http';
import { sendJson, sendText } from '../../ch17-minimal-server/solutions/send.mjs';

const PORT = 9180;
const tasks = [
  { id: 1, title: '牛乳を買う' },
  { id: 2, title: '第18章を読む' },
];

const server = http.createServer((req, res) => {
  const { pathname } = new URL(`http://localhost${req.url}`);
  console.log(`${req.method} ${pathname}`);

  if (req.method === 'GET' && pathname === '/') {
    return sendText(res, 200, 'タスクの API です。/api/tasks を開いてください\n');
  }
  if (req.method === 'GET' && pathname === '/api/tasks') {
    return sendJson(res, 200, tasks);
  }
  // 正規表現で id を取り出す。^ と $ を忘れると、/api/tasks/1/xxx にもあてはまる
  const m = /^\/api\/tasks\/(\d+)$/.exec(pathname);
  if (req.method === 'GET' && m) {
    const task = tasks.find((t) => t.id === Number(m[1]));
    return task ? sendJson(res, 200, task) : sendJson(res, 404, { error: 'ありません' });
  }
  // ここまで来たら全部 404。でも DELETE /api/tasks/1 は「パスはあるがメソッドが違う」ので、本当は 405
  return sendJson(res, 404, { error: 'ありません' });
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
