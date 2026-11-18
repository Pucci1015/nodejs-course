// 練習問題8 で確かめる関数（正しい実装）。書き換えないでください
// 固定の窓で回数を数える（第5部 第24章 5節の rateLimit を、関数だけにしたもの）
//   windowMs ごとに区切った時間の中で、キーごとに limit 回まで許す
//   now() は「今」をミリ秒で返す関数。テストでは偽物を渡す

export interface LimiterOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
}

export interface HitResult {
  allowed: boolean;
  remaining: number; // この窓で、あと何回できるか
  retryAfterMs: number; // 断ったとき、次の窓まで何ミリ秒か（許したときは 0）
}

export function createLimiter({ limit, windowMs, now = Date.now }: LimiterOptions) {
  const counts = new Map<string, { windowStart: number; count: number }>();

  return {
    hit(key: string): HitResult {
      const t = now();
      const windowStart = t - (t % windowMs); // 今の窓が始まった時刻
      let entry = counts.get(key);
      if (entry === undefined || entry.windowStart !== windowStart) {
        entry = { windowStart, count: 0 };
        counts.set(key, entry);
      }
      if (entry.count >= limit) {
        return { allowed: false, remaining: 0, retryAfterMs: windowStart + windowMs - t };
      }
      entry.count++;
      return { allowed: true, remaining: limit - entry.count, retryAfterMs: 0 };
    },
  };
}
