// 第65章 練習問題5: 共有キャッシュ（CDN）が、この応答を覚えてよいか（本文 4.2節）

/** ヘッダの名前は小文字 */
export type Headers = Record<string, string | undefined>;
export type CachedRequest = { method: string; headers: Headers };
export type CachedResponse = { status: number; headers: Headers };

export type Reason = 'method' | 'status' | 'no-store' | 'private' | 'set-cookie' | 'vary-star' | 'authorization' | 'no-freshness';

/** 覚えてよければ undefined、だめなら理由 */
export function whyNotStore(req: CachedRequest, res: CachedResponse): Reason | undefined {
  // ここを書く
  throw new Error(`まだ書いていません（${typeof req} ${typeof res}）`);
}
