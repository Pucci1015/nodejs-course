// 練習問題3: リクエストの回数を制限するミドルウェア
// 要件は exercises/README.md の問題3です。確かめ方:
//   $ node --test rate-limit.test.mjs

/**
 * @param {{ windowMs?: number, limit?: number, key?: (req) => string, now?: () => number }} [options]
 * @returns {import('express').RequestHandler & { size: () => number }}
 */
export function rateLimit({ windowMs = 60_000, limit = 60, key = (req) => req.ip, now = Date.now } = {}) {
  const hits = new Map(); // key → { count, resetAt }

  function middleware(req, res, next) {
    // ここを書く
    next();
  }
  middleware.size = () => hits.size;
  return middleware;
}
