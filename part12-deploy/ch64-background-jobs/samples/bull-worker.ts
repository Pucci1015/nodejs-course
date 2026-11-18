// 第64章 5.3節: 列「mail」の仕事を処理するワーカー
// 動かし方（章のフォルダで）: node samples/bull-worker.ts
//   FAIL=2 を付けると、どの仕事も最初の 2 回はわざと失敗する（再試行を見る）
//   WORK_MS=3000 を付けると、1つの仕事に 3 秒かかる（止め方を見る。既定は 200）
//   Ctrl+C か SIGTERM で、処理中の仕事を終えてから止まる
import { Worker } from 'bullmq';
import { redisConnection } from './bull-connection.ts';

const failTimes = Number(process.env.FAIL ?? 0);
const workMs = Number(process.env.WORK_MS ?? 200);
const started = Date.now();
const t = () => `${((Date.now() - started) / 1000).toFixed(1)}s`;

const connection = redisConnection();
const worker = new Worker(
  'mail',
  async (job) => {
    // job.attemptsMade は、これまでに失敗した回数（最初は 0）
    console.log(`${t()} 仕事 ${job.id} を始めます（${job.attemptsMade + 1} 回目）: ${JSON.stringify(job.data)}`);
    if (job.attemptsMade < failTimes) throw new Error('メールのサーバにつながりません（わざと）');
    await new Promise((r) => setTimeout(r, workMs)); // 送るつもり
    return { sentAt: new Date().toISOString() }; // 戻り値は job.returnvalue に残る
  },
  { connection, concurrency: 2 },
);

worker.on('completed', (job) => console.log(`${t()} 仕事 ${job.id} が終わりました`));
worker.on('failed', (job, err) => console.log(`${t()} 仕事 ${job?.id} が失敗: ${err.message}`));

async function stop(signal: string) {
  console.log(`${t()} ${signal} を受けました。処理中の仕事を終えてから止まります`);
  await worker.close(); // 新しい仕事を取らず、処理中のものが終わるのを待つ
  await connection.close();
  console.log(`${t()} 止まりました`);
}
process.once('SIGINT', () => void stop('SIGINT'));
process.once('SIGTERM', () => void stop('SIGTERM'));
console.log('列 mail を待っています');
