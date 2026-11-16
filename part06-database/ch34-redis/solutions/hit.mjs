// 練習問題3 の模範解答

export async function hit(redis, key, { limit, windowSec }) {
  // MULTI … EXEC で、3つのコマンドを割り込まれずに続けて動かす
  const [count, , ttl] = await redis
    .multi()
    .incr(key)
    .expire(key, windowSec, 'NX') // 期限が無いときだけ付ける。毎回付け直すと、窓が終わらなくなる
    .ttl(key)
    .exec();
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), retryAfter: ttl };
}
