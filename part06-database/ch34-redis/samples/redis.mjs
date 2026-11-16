// 第34章 2.1節で書く、Redis につなぐ部品の完成形
// 使い方: import { createRedis } from './redis.mjs';  const redis = await createRedis();  …  await redis.close();
import { createClient } from 'redis';

// compose.yaml の Redis は、Mac の 127.0.0.1:6380 で待っている
export const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6380';

export async function createRedis() {
  const redis = createClient({
    url: REDIS_URL,
    socket: {
      // 切れたら 0.5 秒ごとにつなぎ直す。5 回続けて失敗したらあきらめる（何もしないと、いつまでも試し続ける）
      reconnectStrategy: (retries) => (retries >= 5 ? new Error(`Redis につながりません（${REDIS_URL}）`) : 500),
    },
  });
  // error のイベントを受け取らないと、つながらないときに Node.js のプロセスが落ちる
  redis.on('error', (err) => console.error('Redis のエラー:', err.message));
  await redis.connect();
  return redis;
}
