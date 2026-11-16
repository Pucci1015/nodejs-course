// 5.3節: サーバを起動する。PORT が無ければ 9477
import { createApp } from './app.ts';
import { createMemoryTaskRepo } from './memory-repo.ts';

const port = Number(process.env.PORT ?? 9477);
const repo = createMemoryTaskRepo();
await repo.create({ title: '牛乳を買う' });
await repo.create({ title: '本を返す', status: 'doing' });

const app = createApp(repo);
app.listen(port, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${port}/api/tasks で待っています`);
});
