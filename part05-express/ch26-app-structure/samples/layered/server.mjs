// 起動する場所（第26章 4節）。ここだけが「本物」を選んで、つなぐ（コンポジションルート）
//   $ node server.mjs
//   別のターミナルで:
//     curl -si -X POST -H 'Content-Type: application/json' -d '{"title":"牛乳"}' http://127.0.0.1:9331/api/tasks
//     curl -s http://127.0.0.1:9331/api/tasks
//     curl -si -X POST -H 'Content-Type: application/json' -d '{"title":"牛乳"}' http://127.0.0.1:9331/api/tasks   ← 409
import { createApp } from './app.mjs';
import { createMemoryTaskRepo } from './repositories/memory-task-repo.mjs';
import { createTaskService } from './services/task-service.mjs';

const repo = createMemoryTaskRepo();
const service = createTaskService({ repo, clock: () => new Date(), maxTasks: 100 });
const app = createApp({ service });

app.listen(9331, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9331/ で待っています（Ctrl+C で止める）');
});
