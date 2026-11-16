// 第34章 4.2節で書く、INCR と EXPIRE で回数を制限するプログラムの完成形
// 使い方（~/dev/part06/ch34-redis で）: node samples/rate-limit-try.mjs
import { createRedis } from './redis.mjs';

const redis = await createRedis();
const LIMIT = 5; // 窓の中で 5 回まで
const WINDOW_SEC = 10; // 窓は 10 秒

async function hit(who) {
  const key = `rate:login:${who}`;
  // MULTI … EXEC: 中のコマンドを、ほかのコマンドに割り込まれずに、続けて動かす
  const [count, , ttl] = await redis
    .multi()
    .incr(key) // 数を 1 増やす（無ければ 1）
    .expire(key, WINDOW_SEC, 'NX') // 期限がまだ無いときだけ、10 秒の期限を付ける（窓の始まり）
    .ttl(key) // 窓が終わるまでの秒数
    .exec();
  return { count, allowed: count <= LIMIT, retryAfter: ttl };
}

await redis.del(['rate:login:alice', 'rate:login:bob']);
for (let i = 1; i <= 7; i++) {
  console.log(`alice の ${i} 回目:`, await hit('alice'));
}
console.log('bob の 1 回目:', await hit('bob'));
await redis.del(['rate:login:alice', 'rate:login:bob']);
await redis.close();
