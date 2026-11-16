// 第34章 3.1節で書く、キャッシュ（cache-aside）を確かめるプログラムの完成形
// 使い方（~/dev/part06/ch34-redis で）: node samples/cache-try.mjs
import { setTimeout as sleep } from 'node:timers/promises';
import { createRedis } from './redis.mjs';

const redis = await createRedis();
const KEY = 'cache:tasks:open';

// データベースの代わり。読むのに 300 ミリ秒かかる、と考える
const table = [
  { id: 2, title: '本を返す' },
  { id: 5, title: '報告書を書く' },
];
async function loadFromDb() {
  await sleep(300);
  return table.map((t) => ({ ...t }));
}

// cache-aside: まずキャッシュを見る。無ければデータベースから読み、キャッシュに入れてから返す
async function listOpenTasks() {
  const hit = await redis.get(KEY);
  if (hit !== null) return { from: 'キャッシュ', tasks: JSON.parse(hit) };
  const tasks = await loadFromDb();
  await redis.setEx(KEY, 60, JSON.stringify(tasks)); // 60 秒たったら、Redis が自動で消す
  return { from: 'データベース', tasks };
}

async function measure(label) {
  const start = performance.now();
  const { from, tasks } = await listOpenTasks();
  console.log(`${label}: ${from}から ${(performance.now() - start).toFixed(1)} ミリ秒`, tasks.map((t) => t.title));
}

await redis.del(KEY);
await measure('1回目');
await measure('2回目');
await measure('3回目');

// データを変えたのに、キャッシュを消さないと……
table.push({ id: 6, title: '窓を拭く' });
await measure('変えた後（消さない）');

// 変えたら、キャッシュを消す（次に読んだ人が、新しいものを入れ直す）
await redis.del(KEY);
await measure('変えた後（消した）');

console.log('残りの秒数:', await redis.ttl(KEY));
await redis.del(KEY);
await redis.close();
