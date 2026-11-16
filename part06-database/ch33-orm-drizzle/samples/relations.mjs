// 第33章 5節で書く、N+1 の問題と、その直し方を確かめるプログラムの完成形
// 使い方（~/dev/part06/ch33-orm-drizzle で）: node samples/relations.mjs   （先に node samples/seed.mjs）
import { drizzle } from 'drizzle-orm/node-postgres';
import { asc, eq } from 'drizzle-orm';
import { DATABASE_URL } from './db.mjs';
import * as schema from './schema.mjs';
import { tags, taskTags, tasks } from './schema.mjs';

// 送った SQL の数を数える logger
let queries = 0;
const db = drizzle(DATABASE_URL, { schema, logger: { logQuery: () => queries++ } });
async function measure(label, fn) {
  queries = 0;
  const result = await fn();
  console.log(`${label}: SQL ${queries} 回`, JSON.stringify(result));
}

// 1. タスクを読んでから、タスクごとにタグを読む（タスクが N 個なら、1 + N 回）
await measure('1. タスクごとに読む ', async () => {
  const list = await db.select({ id: tasks.id, title: tasks.title }).from(tasks).orderBy(asc(tasks.id));
  for (const t of list) {
    const rows = await db.select({ name: tags.name }).from(taskTags).innerJoin(tags, eq(tags.id, taskTags.tagId)).where(eq(taskTags.taskId, t.id));
    t.tags = rows.map((r) => r.name);
  }
  return list;
});

// 2. JOIN で1回に読み、JavaScript でまとめる
await measure('2. JOIN で1回      ', async () => {
  const rows = await db
    .select({ id: tasks.id, title: tasks.title, tag: tags.name })
    .from(tasks)
    .leftJoin(taskTags, eq(taskTags.taskId, tasks.id))
    .leftJoin(tags, eq(tags.id, taskTags.tagId))
    .orderBy(asc(tasks.id), asc(tags.name));
  const byId = new Map();
  for (const r of rows) {
    if (!byId.has(r.id)) byId.set(r.id, { id: r.id, title: r.title, tags: [] });
    if (r.tag !== null) byId.get(r.id).tags.push(r.tag);
  }
  return [...byId.values()];
});

// 3. relations を使う db.query（Drizzle が1つの SQL にしてくれる）
await measure('3. db.query の with ', async () => {
  const list = await db.query.tasks.findMany({
    columns: { id: true, title: true },
    with: { taskTags: { columns: {}, with: { tag: { columns: { name: true } } } } },
    orderBy: (t, { asc }) => [asc(t.id)],
  });
  return list.map((t) => ({ id: t.id, title: t.title, tags: t.taskTags.map((x) => x.tag.name) }));
});

await db.$client.end();
