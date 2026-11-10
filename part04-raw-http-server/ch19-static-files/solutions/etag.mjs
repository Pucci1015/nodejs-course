// 練習問題3 の模範解答
export function weakEtag(stat) {
  const size = stat.size.toString(16);
  const time = Math.floor(stat.mtimeMs).toString(16);
  return `W/"${size}-${time}"`;
}

// W/ を取った形で比べる（弱い比較）
const strip = (tag) => (tag.startsWith('W/') ? tag.slice(2) : tag);

export function isNotModified(ifNoneMatch, etag) {
  if (ifNoneMatch === undefined || ifNoneMatch === null) return false;
  if (ifNoneMatch.trim() === '*') return true;
  return ifNoneMatch
    .split(',')
    .map((t) => t.trim())
    .some((t) => strip(t) === strip(etag));
}
