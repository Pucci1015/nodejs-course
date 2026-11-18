// ミュータント: retryAfterMs を、いつも窓の長さにする

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
        return { allowed: false, remaining: 0, retryAfterMs: windowMs };
      }
      entry.count++;
      return { allowed: true, remaining: limit - entry.count, retryAfterMs: 0 };
    },
  };
}
