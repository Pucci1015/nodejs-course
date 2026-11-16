// 練習問題8 の模範解答

export function redisRateLimit({ redis, limit, windowSec, prefix = 'rate:', key = (req) => req.ip }) {
  // 設定のまちがいは、作る時点で見つける（第24章 練習問題5と同じ）
  if (!Number.isInteger(limit) || limit <= 0) throw new TypeError('limit は正の整数にしてください');
  if (!Number.isInteger(windowSec) || windowSec <= 0) throw new TypeError('windowSec は正の整数（秒）にしてください');

  return async function rateLimit(req, res, next) {
    if (req.method === 'OPTIONS') return next(); // プリフライトはブラウザが自動で送るもの。数えない
    const k = prefix + String(key(req) ?? 'unknown');
    let count, ttl;
    try {
      [count, , ttl] = await redis.multi().incr(k).expire(k, windowSec, 'NX').ttl(k).exec();
    } catch (err) {
      // Redis が止まっていても、サービス全体は止めない（制限せずに通す。fail open）
      console.error('回数の制限: Redis のエラーなので通します:', err.message);
      return next();
    }
    res.set('RateLimit-Limit', String(limit));
    res.set('RateLimit-Remaining', String(Math.max(0, limit - count)));
    res.set('RateLimit-Reset', String(ttl));
    if (count > limit) {
      res.set('Retry-After', String(ttl));
      return res.status(429).json({ error: 'too many requests' });
    }
    next();
  };
}
