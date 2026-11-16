// 第34章 6.1節で書く、Pub/Sub でプロセスの間に知らせを配るプログラムの完成形
// 使い方（~/dev/part06/ch34-redis で）:
//   ターミナル1・2: node samples/pubsub.mjs listen          （受け取る側。2つ動かしてもよい）
//   ターミナル3:    node samples/pubsub.mjs send 本を返す   （配る側）
import { createRedis } from './redis.mjs';

const CHANNEL = 'events:tasks';
const [mode, ...words] = process.argv.slice(2);
const redis = await createRedis();

if (mode === 'listen') {
  // subscribe した接続は、知らせを待つ専用になり、ほかのコマンド（GET など）は送れない
  await redis.subscribe(CHANNEL, (message) => {
    const event = JSON.parse(message);
    console.log(`受け取った: ${event.type} 「${event.title}」 (${event.at})`);
  });
  console.log(`${CHANNEL} を待っています（Ctrl+C で止める）`);
  process.on('SIGINT', async () => {
    await redis.close();
    process.exit(0);
  });
} else if (mode === 'send') {
  const event = { type: 'task.created', title: words.join(' ') || '（題名なし）', at: new Date().toISOString() };
  // publish は、今その場で受け取った接続の数を返す。だれも待っていなければ 0（知らせは残らない）
  const receivers = await redis.publish(CHANNEL, JSON.stringify(event));
  console.log(`配りました。受け取った数: ${receivers}`);
  await redis.close();
} else {
  console.log('使い方: node samples/pubsub.mjs listen  か  node samples/pubsub.mjs send 題名');
  await redis.close();
}
