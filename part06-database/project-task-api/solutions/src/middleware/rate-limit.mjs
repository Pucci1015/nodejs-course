// 第24章 練習問題5の模範解答（ch24-middleware/solutions/rate-limit.mjs）のコピー。429 を problem+json にした（「変更（成果物）」）
// 固定の窓（fixed window）で回数を数える
// 1台のサーバのメモリに数えるので、サーバが複数台あると、台ごとに別々に数えることになる。
// 共有するなら Redis などに置く（第6部 第34章）。
import { HttpProblem } from './problem.mjs';

/**
 * @param {{ windowMs?: number, limit?: number, key?: (req) => string, now?: () => number }} [options]
 */
export function rateLimit({ windowMs = 60_000, limit = 60, key = (req) => req.ip, now = Date.now } = {}) {
  // 追加: 設定の間違いは、作る時点で見つける
  if (!Number.isInteger(limit) || limit <= 0) throw new TypeError('limit は正の整数にしてください');
  if (!Number.isInteger(windowMs) || windowMs <= 0) throw new TypeError('windowMs は正の整数（ミリ秒）にしてください');

  const hits = new Map(); // key → { count, resetAt }
  let nextPrune = 0;

  // 追加: 終わった窓の記録を消す。毎回すべてを見ると重いので、窓の長さに1回だけ
  function prune(t) {
    if (t < nextPrune) return;
    nextPrune = t + windowMs;
    for (const [k, v] of hits) if (v.resetAt <= t) hits.delete(k);
  }

  function middleware(req, res, next) {
    if (req.method === 'OPTIONS') return next(); // 追加: プリフライトはブラウザが自動で送るもの。数えない
    const t = now();
    prune(t);

    const k = String(key(req) ?? 'unknown');
    let entry = hits.get(k);
    if (!entry || entry.resetAt <= t) {
      entry = { count: 0, resetAt: t + windowMs };
      hits.set(k, entry);
    }
    entry.count += 1;

    const resetSec = Math.ceil((entry.resetAt - t) / 1000);
    // 名前は IETF の RateLimit ヘッダの案（draft-ietf-httpapi-ratelimit-headers）の古い形。
    // 執筆時点では標準になっていないので、使う側と決めごとにしておく
    res.set('RateLimit-Limit', String(limit));
    res.set('RateLimit-Remaining', String(Math.max(0, limit - entry.count)));
    res.set('RateLimit-Reset', String(resetSec));

    if (entry.count > limit) {
      // 変更（成果物）: ほかのエラーと同じ problem+json にする（problemHandler が Retry-After も付ける）
      // 429 には、いつ試し直せばよいかを付ける（RFC 6585）
      return next(new HttpProblem(429, { detail: `${resetSec} 秒後に試してください`, headers: { 'Retry-After': String(resetSec) } }));
    }
    next();
  }
  middleware.size = () => hits.size;
  return middleware;
}
