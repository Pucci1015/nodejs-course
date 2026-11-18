// 第64章 5.1節: BullMQ がつなぐ Redis（ほかのサンプルが import する）
// BullMQ 6 は、node-redis（第6部 第34章の redis パッケージ）の接続を、そのまま渡せる
import { createClient } from 'redis';

export const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6380';

/**
 * BullMQ に渡す接続。Queue と Worker で、別々に作る（Worker は待ち受けのために接続を1本使い続ける）
 * 渡した接続は、BullMQ がつなぐが、閉じはしない。queue.close() の後で、自分で close() する
 */
export function redisConnection() {
  return createClient({ url: REDIS_URL });
}
