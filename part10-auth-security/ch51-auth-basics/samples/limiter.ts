// 6節: ログインの失敗を数え、多すぎたら少しの間ことわる（固定の窓。第5部 第24章 5節と同じ考え方）
export type LimitResult = { ok: true } | { ok: false; retryAfter: number };

export function createLoginLimiter({ max = 5, windowMs = 15 * 60_000, now = Date.now } = {}) {
  /** キー（メールアドレスなど）ごとの、窓の始まりと失敗の数 */
  const failures = new Map<string, { start: number; count: number }>();

  function current(key: string) {
    const entry = failures.get(key);
    if (entry === undefined || now() - entry.start >= windowMs) return undefined; // 窓が終わっていれば、数え直し
    return entry;
  }

  return {
    /** ログインを試してよいか（パスワードを確かめる前に呼ぶ） */
    check(key: string): LimitResult {
      const entry = current(key);
      if (entry === undefined || entry.count < max) return { ok: true };
      return { ok: false, retryAfter: Math.ceil((entry.start + windowMs - now()) / 1000) };
    },
    /** 失敗したら呼ぶ */
    fail(key: string): void {
      const entry = current(key);
      if (entry === undefined) failures.set(key, { start: now(), count: 1 });
      else entry.count++;
    },
    /** 成功したら呼ぶ（数を消す） */
    reset(key: string): void {
      failures.delete(key);
    },
  };
}
