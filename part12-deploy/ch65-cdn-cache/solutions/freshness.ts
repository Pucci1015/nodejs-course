// 第65章 練習問題3: 覚えた応答の「今の年齢」と、新鮮か・古いけれどすぐ返してよいか・古いか（本文 3.2〜3.4節）

export type StoredInfo = {
  /** 覚えた時刻（ミリ秒） */
  storedAt: number;
  /** オリジンが返した Age ヘッダの値（秒）。無ければ 0 */
  initialAge: number;
  /** 新鮮な秒数（s-maxage か max-age） */
  lifetime: number;
  /** stale-while-revalidate の秒数。無ければ 0 */
  swr: number;
};

export type CacheState = { age: number; state: 'fresh' | 'stale-while-revalidate' | 'stale' };

function ageOf(info: StoredInfo, now: number): number {
  // オリジン（やその手前のキャッシュ）で過ぎた時間 + ここで過ぎた時間。秒に切り捨てる
  return Math.max(0, info.initialAge + Math.floor((now - info.storedAt) / 1000));
}

export function cacheState(info: StoredInfo, now: number): CacheState {
  const age = ageOf(info, now);
  if (age < info.lifetime) return { age, state: 'fresh' };
  if (age < info.lifetime + info.swr) return { age, state: 'stale-while-revalidate' };
  return { age, state: 'stale' };
}

/** 返すときの Age ヘッダの値（文字列）。年齢が負なら '0' */
export function ageHeader(info: StoredInfo, now: number): string {
  return String(ageOf(info, now));
}
