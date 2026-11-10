// SimpleRouter でタスクの API を書く（第18章 4節）
// 使い方: node router-demo.mjs
//   curl -i http://127.0.0.1:9181/api/tasks/1
//   curl -i -X DELETE http://127.0.0.1:9181/api/tasks/1
//   curl -i -X PUT http://127.0.0.1:9181/api/tasks/1      → 405 と Allow
//   curl -i http://127.0.0.1:9181/api/tasks/me             → :id より先に登録したので、me のルート
import http from 'node:http';
import { createApp, HttpError } from '../../ch17-minimal-server/solutions/app.mjs';
import { noContent, sendJson } from '../../ch17-minimal-server/solutions/send.mjs';
import { SimpleRouter } from './router.mjs';

const PORT = 9181;
let tasks = [
  { id: 1, title: '牛乳を買う', owner: 'alice' },
  { id: 2, title: '第18章を読む', owner: 'alice' },
];

function findTask(id) {
  const task = tasks.find((t) => String(t.id) === id);
  if (!task) throw new HttpError(404, 'ありません');
  return task;
}

const router = new SimpleRouter()
  .add('GET', '/api/tasks', (req, res) => sendJson(res, 200, tasks))
  // SimpleRouter は登録した順に試すので、/api/tasks/me は /api/tasks/:id より先に書く必要がある
  .add('GET', '/api/tasks/me', (req, res) => sendJson(res, 200, tasks.filter((t) => t.owner === 'alice')))
  .add('GET', '/api/tasks/:id', (req, res, { id }) => sendJson(res, 200, findTask(id)))
  .add('DELETE', '/api/tasks/:id', (req, res, { id }) => {
    const task = findTask(id);
    tasks = tasks.filter((t) => t !== task);
    noContent(res);
  });

// 第17章の createApp で包む。HttpError（404・405）は JSON になり、それ以外の失敗は 500
const server = http.createServer(createApp(router.handle));
server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
