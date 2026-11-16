// 練習問題8: 回数の制限を Redis に数える Express のミドルウェアを書いてください（第24章 練習問題5の Redis 版）。
// 要件は README にあります。
// 確かめ方: node --test redis-rate-limit.test.mjs

export function redisRateLimit({ redis, limit, windowSec, prefix = 'rate:', key = (req) => req.ip }) {
  // ここを書く（設定の確かめと、ミドルウェアの関数を返す）
}
