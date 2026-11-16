// 第25章 練習問題8の模範解答（ch25-rest-api-design/solutions/preconditions.mjs）のコピー。そのまま使う
// If-Match・If-None-Match を、RFC 9110 13.2.2 の順番どおりに確かめる

/**
 * ETag の並び（'"a", W/"b", *'）を読む。
 * 返すもの: '*' か、[{ weak, tag }] の配列。形の正しくないものは入れない（どれにもあてはまらない）
 * opaque-tag の中には , を書けるので、split(',') では読めない
 */
export function parseEntityTags(header) {
  if (header === undefined || header === null) return [];
  const s = String(header).trim();
  if (s === '*') return '*';
  const list = [];
  // 修正: 「W/ があるかもしれない "…"」を前から1つずつ取り出す。" の中には " 以外の見える文字が入る
  const re = /\s*(W\/)?"([\x21\x23-\x7e\x80-\xff]*)"\s*(?:,|$)/y;
  let m;
  while (re.lastIndex < s.length && (m = re.exec(s))) list.push({ weak: Boolean(m[1]), tag: m[2] });
  return list;
}

/** 強い比べ方: どちらも強い ETag で、中身が同じ（If-Match で使う） */
const strongMatch = (a, b) => !a.weak && !b.weak && a.tag === b.tag;
/** 弱い比べ方: W/ を気にせず、中身が同じ（If-None-Match で使う） */
const weakMatch = (a, b) => a.tag === b.tag;

/**
 * 条件つきリクエストを確かめる。
 * @param {{ method: string, ifMatch?: string, ifNoneMatch?: string, etag?: string, exists: boolean, requireIfMatch?: boolean }} o
 *   etag は今のものの ETag（'"3"' の形）。exists が false なら、まだ無い
 * @returns {'proceed' | 304 | 412 | 428}
 */
export function evaluatePreconditions({ method, ifMatch, ifNoneMatch, etag, exists, requireIfMatch = false }) {
  const current = exists && etag ? parseEntityTags(etag)[0] : undefined;
  const safe = method === 'GET' || method === 'HEAD';

  // 追加: 変えるリクエストで If-Match も If-None-Match も無いなら 428（「どの版を見たか」を送ってもらう）
  if (requireIfMatch && !safe && ifMatch === undefined && ifNoneMatch === undefined) return 428;

  // 1. If-Match（RFC 9110 13.2.2 の手順1）
  if (ifMatch !== undefined) {
    const tags = parseEntityTags(ifMatch);
    // 修正: * は「何かあれば」。無いものに * は 412
    const ok = tags === '*' ? exists : current !== undefined && tags.some((t) => strongMatch(t, current));
    if (!ok) return 412;
  }

  // 3. If-None-Match（手順3）。If-Match があっても確かめる
  if (ifNoneMatch !== undefined) {
    const tags = parseEntityTags(ifNoneMatch);
    const matched = tags === '*' ? exists : current !== undefined && tags.some((t) => weakMatch(t, current));
    // 修正: あてはまったとき、GET・HEAD は 304、それ以外（PUT で上書きしない、など）は 412
    if (matched) return safe ? 304 : 412;
  }
  return 'proceed';
}
