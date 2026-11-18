// 第65章 練習問題5: 共有キャッシュ（CDN）が、この応答を覚えてよいか（本文 4.2節）

/** ヘッダの名前は小文字 */
export type Headers = Record<string, string | undefined>;
export type CachedRequest = { method: string; headers: Headers };
export type CachedResponse = { status: number; headers: Headers };

export type Reason = 'method' | 'status' | 'no-store' | 'private' | 'set-cookie' | 'vary-star' | 'authorization' | 'no-freshness';

/** 覚えてよい状態の番号（RFC 9110 15.1節の「heuristically cacheable」なもの。206 は扱わない） */
const STORABLE_STATUS = [200, 203, 204, 300, 301, 308, 404, 405, 410, 414, 501];

/** 本文 2.2節の分け方（"…" の中のカンマは考えない） */
function directives(value: string | undefined): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of (value ?? '').split(',')) {
    const [name = '', arg = ''] = part.trim().split('=');
    if (name !== '') out.set(name.toLowerCase(), arg);
  }
  return out;
}

/** 覚えてよければ undefined、だめなら理由 */
export function whyNotStore(req: CachedRequest, res: CachedResponse): Reason | undefined {
  const cc = directives(res.headers['cache-control']);
  if (req.method !== 'GET') return 'method';
  if (!STORABLE_STATUS.includes(res.status)) return 'status';
  if (cc.has('no-store')) return 'no-store';
  if (cc.has('private')) return 'private';
  if (res.headers['set-cookie'] !== undefined) return 'set-cookie';
  if (res.headers['vary']?.split(',').some((v) => v.trim() === '*')) return 'vary-star';
  if (req.headers['authorization'] !== undefined && !cc.has('public') && !cc.has('s-maxage')) return 'authorization';
  if (!cc.has('s-maxage') && !cc.has('max-age') && !cc.has('no-cache')) return 'no-freshness';
  return undefined;
}
