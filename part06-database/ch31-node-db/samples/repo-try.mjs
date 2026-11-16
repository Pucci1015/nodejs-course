// 第31章 3節で書く、リポジトリを試すプログラムの完成形
// 使い方（~/dev/part06/ch31-node-db で）: node samples/repo-try.mjs
import { createTaskDb } from './task-db.mjs';
import { createSqliteTaskRepo } from './task-repo.mjs';

const db = createTaskDb();
const repo = createSqliteTaskRepo(db);

const now = new Date().toISOString();
const created = await repo.insert({ title: '花に水をやる', status: 'todo', dueDate: null, createdAt: now, updatedAt: now, completedAt: null, version: 1 });
console.log('insert:', created);

console.log('update（version 1 のつもり）:', await repo.update(created.id, { title: '花と木に水をやる', version: 2 }, { expectedVersion: 1 }));
console.log('update（古い version 1 のまま）:', await repo.update(created.id, { title: '別の題名', version: 2 }, { expectedVersion: 1 }));

console.log('remove:', await repo.remove(created.id));
console.log('get（消した後）:', await repo.get(created.id));
console.log('list の題名:', (await repo.list()).map((t) => t.title));

try {
  await repo.update(2, { owner: 'bob' });
} catch (err) {
  console.log('知らない項目:', err.message);
}
db.close();
