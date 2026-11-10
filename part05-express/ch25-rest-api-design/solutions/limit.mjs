// 練習問題3 の模範解答
export function parseLimit(value) {
  if (value === undefined) return { ok: true, value: 20 };
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,2}$/.test(value)) return { ok: false };
  const n = Number(value);
  return n <= 100 ? { ok: true, value: n } : { ok: false };
}

export function nextLink(pathname, query, nextCursor) {
  if (nextCursor === null) return null;
  const params = new URLSearchParams(query);
  params.set('cursor', nextCursor);
  return `${pathname}?${params}`;
}
