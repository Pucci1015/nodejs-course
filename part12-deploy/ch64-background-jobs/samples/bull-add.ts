// 第64章 5.2節: BullMQ の列「mail」に仕事を入れる
// 動かし方（章のフォルダで）: node samples/bull-add.ts 3
import { Queue } from 'bullmq';
import { redisConnection } from './bull-connection.ts';

const connection = redisConnection();
const queue = new Queue('mail', { connection });
const n = Number(process.argv[2] ?? 3);
for (let i = 1; i <= n; i += 1) {
  const job = await queue.add(
    'welcome', // 仕事の名前（種類）
    { to: `user${i}@example.com` }, // データ（JSON にして Redis に置かれる）
    {
      attempts: 4, // 失敗したら、合わせて 4 回まで
      backoff: { type: 'exponential', delay: 500 }, // 0.5 秒、1 秒、2 秒…と待ってから
      removeOnComplete: 100, // 終わったものは、新しい 100 個だけ残す
      removeOnFail: 500,
    },
  );
  console.log(`入れました: 仕事 ${job.id}（${job.name}）`);
}
await queue.close();
await connection.close(); // 渡した接続は、自分で閉じる（閉じないと、プロセスが終わらない）
