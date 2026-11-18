// 第64章 6節: 決まった時刻・間隔で、仕事を入れる（ジョブスケジューラ）
// 動かし方（章のフォルダで）: node samples/bull-schedule.ts        → 2 秒ごとの「heartbeat」と、毎朝 8 時（日本時間）の「daily-digest」を登録
//                             node samples/bull-schedule.ts --list → 登録されているものと、次に入る時刻
//                             node samples/bull-schedule.ts --remove → 2つとも消す
import { Queue } from 'bullmq';
import { redisConnection } from './bull-connection.ts';

const connection = redisConnection();
const queue = new Queue('mail', { connection });

if (process.argv[2] === '--remove') {
  await queue.removeJobScheduler('heartbeat');
  await queue.removeJobScheduler('daily-digest');
  console.log('消しました');
} else if (process.argv[2] === '--list') {
  for (const s of await queue.getJobSchedulers()) {
    const next = s.next === undefined ? '-' : new Date(s.next).toISOString();
    console.log(`${s.key}: every=${s.every ?? '-'} pattern=${s.pattern ?? '-'} tz=${s.tz ?? '-'} 次=${next}`);
  }
} else {
  // 同じ ID で何度登録しても、1つのまま（upsert = あれば直し、無ければ足す）。起動のたびに呼んでよい
  await queue.upsertJobScheduler('heartbeat', { every: 2000 }, { name: 'heartbeat', data: {} });
  await queue.upsertJobScheduler(
    'daily-digest',
    { pattern: '0 8 * * *', tz: 'Asia/Tokyo' }, // 分 時 日 月 曜日（cron の書き方）。日本時間の毎朝 8:00
    { name: 'daily-digest', data: {} },
  );
  console.log('登録しました');
}
await queue.close();
await connection.close();
