// 追加（第12部）: Redis の接続を作る（第6部 第34章、第64章 5.1節）
// 使い道ごとに別の接続にする: 仕事の列（Queue）・ワーカー（待ち受けで1本使い続ける）・知らせを流す・知らせを待つ（Pub/Sub）
import { createClient } from 'redis';
import type { Logger } from 'pino';

/** URL のパスワードを隠す（ログに書くため） */
export const redactRedisUrl = (url: string) => url.replace(/\/\/[^@/]*@/, '//***@');

export function createRedis(url: string, logger: Logger, name: string) {
  const client = createClient({
    url,
    socket: {
      // つながらないときは、待つ時間を延ばしながらつなぎ直す（上限 5 秒）。あきらめない（Redis が戻れば、また動く）
      reconnectStrategy: (retries) => Math.min(100 * 2 ** retries, 5000),
    },
  });
  // error を受け取らないと、プロセスが落ちる。同じエラーが続くので、warn にする
  client.on('error', (err: unknown) => logger.warn({ err, redis: name }, 'Redis のエラー'));
  return client;
}

export type Redis = ReturnType<typeof createRedis>;
