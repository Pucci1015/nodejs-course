// 練習問題6: If-Match・If-None-Match を、RFC 9110 13.2.2 の順番どおりに確かめる
// 要件は exercises/README.md の問題6です。確かめ方:
//   $ node --test preconditions.test.mjs
// 今のひな形は、サンプルの etag-demo.mjs と同じ「文字列が同じか」だけで比べています。

/** ETag の並び（'"a", W/"b", *'）を読む。'*' か [{ weak, tag }] を返す */
export function parseEntityTags(header) {
  if (header === undefined || header === null) return [];
  const s = String(header).trim();
  if (s === '*') return '*';
  // ここを書く: これでは '"a,b"'（, を含む ETag）や W/ を正しく読めない
  return s.split(',').map((x) => ({ weak: false, tag: x.trim().replaceAll('"', '') }));
}

/**
 * @returns {'proceed' | 304 | 412 | 428}
 */
export function evaluatePreconditions({ method, ifMatch, ifNoneMatch, etag, exists, requireIfMatch = false }) {
  // ここを書く: 428、If-Match（強い比べ方、*）、If-None-Match（弱い比べ方、*、GET・HEAD なら 304）
  if (ifMatch !== undefined && ifMatch !== etag) return 412;
  if (ifNoneMatch !== undefined && ifNoneMatch === etag) return 304;
  return 'proceed';
}
